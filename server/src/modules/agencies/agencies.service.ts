import type { ActorRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { broadcast } from '../../lib/realtime';
import { ApiError } from '../../utils/apiError';
import { recordAuditLogSafe } from '../audit/audit.service';
import { transitionApplication } from '../lifecycle/lifecycle.service';
import { notify } from '../notifications/notification.service';

interface Actor {
  actorId: string;
  actorRole: ActorRole;
}

export interface CreateAgencyInput {
  legalName: string;
  gstin: string;
  pan: string;
  contactEmail: string;
  contactPhone: string;
}

/**
 * Admin-initiated agency creation (Decision D7 exception path) — bypasses
 * self-service onboarding to create an already-active agency directly.
 */
export async function createAgency(input: CreateAgencyInput, actor: Actor) {
  const agency = await prisma.agency.create({
    data: { ...input, status: 'ACTIVE', activatedAt: new Date() },
  });
  await recordAuditLogSafe({
    entityType: 'Agency',
    entityId: agency.id,
    event: 'AGENCY_CREATED_BY_ADMIN',
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    after: { legalName: agency.legalName, gstin: agency.gstin },
  });
  broadcast(['agencies']);
  return agency;
}

/**
 * Hard-deletes an agency — only when it has no financial history (bookings,
 * invoices, payments), so nothing traceable is orphaned. Removes its users and
 * commercial configs in the same transaction.
 */
export async function deleteAgency(agencyId: string, actor: Actor) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw ApiError.notFound('Agency not found');

  const [bookings, invoices, payments] = await Promise.all([
    prisma.booking.count({ where: { agencyId } }),
    prisma.invoice.count({ where: { agencyId } }),
    prisma.payment.count({ where: { agencyId } }),
  ]);
  if (bookings > 0 || invoices > 0 || payments > 0) {
    throw ApiError.conflict('Cannot delete an agency that has bookings, invoices, or payments');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.deleteMany({ where: { agencyId } });
    await tx.document.updateMany({ where: { agencyId }, data: { agencyId: null } });
    // commercialConfigurations cascade on agency delete.
    await tx.agency.delete({ where: { id: agencyId } });
  });
  await recordAuditLogSafe({
    entityType: 'Agency',
    entityId: agencyId,
    event: 'AGENCY_DELETED',
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    before: { legalName: agency.legalName },
  });
  broadcast(['agencies'], { agencyId });
  return { deleted: true };
}

export interface ListAgenciesParams {
  page: number;
  pageSize: number;
}

export async function listAgencies({ page, pageSize }: ListAgenciesParams) {
  const [items, total] = await Promise.all([
    prisma.agency.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.agency.count(),
  ]);
  return { items, total, page, pageSize };
}

export async function getAgencyById(id: string) {
  const agency = await prisma.agency.findUnique({ where: { id } });
  if (!agency) {
    throw ApiError.notFound('Agency not found');
  }
  return agency;
}

/**
 * Suspends an active agency: application ACTIVE → SUSPENDED (audited via the
 * lifecycle module) plus agency.status = SUSPENDED. Balances remain due;
 * reversible via reactivate.
 */
export async function suspendAgency(agencyId: string, actor: Actor) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw ApiError.notFound('Agency not found');
  // Onboarded agencies also move their application to SUSPENDED; admin-created
  // agencies (D7) have no application, so just flip the status.
  if (agency.applicationId) {
    await transitionApplication(agency.applicationId, 'SUSPENDED', actor, { reason: 'Agency suspended' });
  }
  const updated = await prisma.agency.update({ where: { id: agencyId }, data: { status: 'SUSPENDED' } });
  await notify(
    { event: 'AGENCY_SUSPENDED', legalName: agency.legalName },
    { email: agency.contactEmail, phone: agency.contactPhone },
    { entityType: 'Agency', entityId: agencyId },
  );
  broadcast(['agencies'], { agencyId });
  return updated;
}

export async function reactivateAgency(agencyId: string, actor: Actor) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw ApiError.notFound('Agency not found');
  if (agency.applicationId) {
    await transitionApplication(agency.applicationId, 'ACTIVE', actor, { reason: 'Agency reactivated' });
  }
  const updated = await prisma.agency.update({ where: { id: agencyId }, data: { status: 'ACTIVE' } });
  await notify(
    { event: 'AGENCY_REACTIVATED', legalName: agency.legalName },
    { email: agency.contactEmail, phone: agency.contactPhone },
    { entityType: 'Agency', entityId: agencyId },
  );
  broadcast(['agencies'], { agencyId });
  return updated;
}
