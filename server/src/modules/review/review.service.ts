import type { ActorRole, VerificationCheckType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { recordAuditLogSafe } from '../audit/audit.service';
import { transitionApplication } from '../lifecycle/lifecycle.service';
import { reinitiateChecks } from '../verification/verification.service';
import { notify } from '../notifications/notification.service';
import type { NotificationPayload } from '../notifications/templates';

interface Actor {
  actorId: string;
  actorRole: ActorRole;
}

async function notifyApplicant(applicationId: string, payload: NotificationPayload): Promise<void> {
  const application = await prisma.agencyApplication.findUnique({ where: { id: applicationId } });
  if (!application) return;
  await notify(
    payload,
    { email: application.businessContactEmail ?? application.repEmail, phone: application.repMobile },
    { entityType: 'AgencyApplication', entityId: applicationId },
  );
}

export async function approveApplication(applicationId: string, actor: Actor): Promise<void> {
  const application = await prisma.agencyApplication.findUnique({ where: { id: applicationId } });
  await transitionApplication(applicationId, 'APPROVED', actor, {
    data: { decision: 'approved', decidedAt: new Date(), decidedById: actor.actorId },
    reason: 'Application approved',
  });
  await notifyApplicant(applicationId, {
    event: 'APPLICATION_APPROVED',
    applicationId,
    legalName: application?.legalName ?? null,
  });
}

export async function rejectApplication(
  applicationId: string,
  reason: string,
  actor: Actor,
): Promise<void> {
  await transitionApplication(applicationId, 'REJECTED', actor, {
    data: {
      decision: 'rejected',
      decisionReason: reason,
      decidedAt: new Date(),
      decidedById: actor.actorId,
    },
    reason,
  });
  await notifyApplicant(applicationId, { event: 'APPLICATION_REJECTED', applicationId, reason });
}

export interface ResubmissionRequest {
  checkTypes?: VerificationCheckType[];
  documentIds?: string[];
  reason: string;
}

export async function requestResubmission(
  applicationId: string,
  req: ResubmissionRequest,
  actor: Actor,
): Promise<void> {
  const application = await prisma.agencyApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw ApiError.notFound('Application not found');
  if (application.lifecycleState !== 'REVIEW') {
    throw ApiError.conflict('Re-submission can only be requested while in Review');
  }

  // Flag any named documents for re-upload.
  if (req.documentIds && req.documentIds.length > 0) {
    await prisma.document.updateMany({
      where: { id: { in: req.documentIds }, applicationId },
      data: { status: 'REJECTED' },
    });
  }

  // Send the application back to Verification and re-run the named checks.
  await transitionApplication(applicationId, 'VERIFICATION', actor, {
    reason: `Re-submission requested: ${req.reason}`,
  });

  if (req.checkTypes && req.checkTypes.length > 0) {
    await reinitiateChecks(applicationId, req.checkTypes);
  }

  await recordAuditLogSafe({
    entityType: 'AgencyApplication',
    entityId: applicationId,
    event: 'RESUBMISSION_REQUESTED',
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    after: { checkTypes: req.checkTypes ?? [], documentIds: req.documentIds ?? [], reason: req.reason },
  });

  await notifyApplicant(applicationId, {
    event: 'RESUBMISSION_REQUESTED',
    applicationId,
    reason: req.reason,
  });
}
