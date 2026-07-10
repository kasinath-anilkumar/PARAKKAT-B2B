import type { AgencyApplication } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { generateRandomToken, sha256Hex, timingSafeEqual } from '../../utils/crypto';
import { logger } from '../../lib/logger';
import { recordAuditLogSafe } from '../audit/audit.service';
import { transitionApplication } from '../lifecycle/lifecycle.service';
import { initiateChecksForApplication } from '../verification/verification.service';
import { notify } from '../notifications/notification.service';
import { type DraftInput, submitApplicationSchema } from './onboarding.schema';

/** Lifecycle states that mean an entity already has a live application/agency in the pipeline. */
const BLOCKING_STATES = [
  'VERIFICATION',
  'REVIEW',
  'APPROVED',
  'COMMERCIAL_CONFIGURATION',
  'ACTIVE',
] as const;

export interface CreatedDraft {
  application: AgencyApplication;
  // Returned exactly once; the applicant needs it (with the application id) to
  // resume, edit, upload to, and submit their draft. Only its hash is stored.
  resumeToken: string;
}

export async function createDraft(input: DraftInput): Promise<CreatedDraft> {
  const resumeToken = generateRandomToken();
  const application = await prisma.agencyApplication.create({
    data: {
      ...input,
      resumeTokenHash: sha256Hex(resumeToken),
      lifecycleState: 'DRAFT',
    },
  });

  await recordAuditLogSafe({
    entityType: 'AgencyApplication',
    entityId: application.id,
    event: 'APPLICATION_DRAFT_CREATED',
    actorId: null,
    actorRole: 'APPLICANT',
  });

  return { application, resumeToken };
}

/** Loads an application and checks the resume token. Throws 401/404 on failure. */
export async function loadByResumeToken(
  applicationId: string,
  resumeToken: string,
): Promise<AgencyApplication> {
  const application = await prisma.agencyApplication.findUnique({ where: { id: applicationId } });
  if (!application || !application.resumeTokenHash) {
    throw ApiError.notFound('Application not found');
  }
  if (!timingSafeEqual(sha256Hex(resumeToken), application.resumeTokenHash)) {
    throw ApiError.unauthorized('Invalid resume token');
  }
  return application;
}

export async function updateDraft(
  application: AgencyApplication,
  patch: DraftInput,
): Promise<AgencyApplication> {
  if (application.lifecycleState !== 'DRAFT') {
    throw ApiError.conflict('This application has already been submitted and can no longer be edited');
  }
  return prisma.agencyApplication.update({
    where: { id: application.id },
    data: patch,
  });
}

async function assertNoDuplicate(
  applicationId: string,
  gstin: string,
  pan: string,
): Promise<void> {
  const dupApplication = await prisma.agencyApplication.findFirst({
    where: {
      id: { not: applicationId },
      lifecycleState: { in: [...BLOCKING_STATES] },
      OR: [{ gstin }, { pan }],
    },
  });
  if (dupApplication) {
    throw ApiError.conflict('An application for this GSTIN or PAN is already in progress');
  }

  const dupAgency = await prisma.agency.findFirst({ where: { OR: [{ gstin }, { pan }] } });
  if (dupAgency) {
    throw ApiError.conflict('An agency for this GSTIN or PAN already exists');
  }
}

export async function submitApplication(
  application: AgencyApplication,
): Promise<AgencyApplication> {
  if (application.lifecycleState !== 'DRAFT') {
    throw ApiError.conflict('This application has already been submitted');
  }

  // Validate the persisted draft is complete and well-formed before it enters
  // the verification pipeline.
  const parsed = submitApplicationSchema.safeParse({
    legalName: application.legalName,
    gstin: application.gstin,
    pan: application.pan,
    addressLine1: application.addressLine1,
    addressLine2: application.addressLine2 ?? undefined,
    city: application.city,
    state: application.state,
    postalCode: application.postalCode,
    country: application.country,
    businessContactEmail: application.businessContactEmail,
    businessContactPhone: application.businessContactPhone,
    repName: application.repName,
    repDesignation: application.repDesignation,
    repEmail: application.repEmail,
    repMobile: application.repMobile,
    repAadhaarRef: application.repAadhaarRef,
    bankAccount: application.bankAccount,
    ifsc: application.ifsc,
    accountHolder: application.accountHolder,
  });

  if (!parsed.success) {
    throw ApiError.badRequest('Application is incomplete or invalid', parsed.error);
  }

  await assertNoDuplicate(application.id, parsed.data.gstin, parsed.data.pan);

  // Route the state change through the single lifecycle module. Actor is the
  // public applicant (no User account yet).
  const submitted = await transitionApplication(
    application.id,
    'VERIFICATION',
    { actorId: null, actorRole: 'APPLICANT' },
    { data: { submittedAt: new Date() } },
  );

  const recipient = {
    email: submitted.businessContactEmail ?? submitted.repEmail,
    phone: submitted.repMobile,
  };
  await notify(
    { event: 'REGISTRATION_RECEIVED', applicationId: submitted.id, legalName: submitted.legalName },
    recipient,
    { entityType: 'AgencyApplication', entityId: submitted.id },
  );

  // Kick off Digio KYB/eKYC checks. Resilient — a failure here leaves the
  // application in VERIFICATION with checks re-initiable by an admin, rather
  // than failing the applicant's submit.
  try {
    await initiateChecksForApplication(submitted.id);
    await notify(
      { event: 'VERIFICATION_STARTED', applicationId: submitted.id, legalName: submitted.legalName },
      recipient,
      { entityType: 'AgencyApplication', entityId: submitted.id },
    );
  } catch (err) {
    logger.error('Failed to initiate verification checks after submit', {
      applicationId: submitted.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return submitted;
}
