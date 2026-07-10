import type { ActorRole, Agency, CommercialConfiguration } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { recordAuditLog } from '../audit/audit.service';
import { transitionApplication } from '../lifecycle/lifecycle.service';
import {
  type CommercialOverrides,
  mapApplicationToAgencyData,
  resolveCommercialTerms,
} from './commercial.mapping';
import { getTierPreset } from './tiers';

interface Actor {
  actorId: string;
  actorRole: ActorRole;
}

/** Creates the Agency for an application if one doesn't exist yet, linking both ways. */
async function ensureAgency(applicationId: string): Promise<Agency> {
  const application = await prisma.agencyApplication.findUnique({
    where: { id: applicationId },
    include: { agency: true },
  });
  if (!application) throw ApiError.notFound('Application not found');
  if (application.agency) return application.agency;

  const data = mapApplicationToAgencyData(application);
  return prisma.$transaction(async (tx) => {
    // Creating the Agency with the application connected sets the one-to-one
    // link (FK lives on Agency.applicationId); no separate application update.
    const agency = await tx.agency.create({
      data: { ...data, application: { connect: { id: applicationId } } },
    });
    await recordAuditLog({
      entityType: 'Agency',
      entityId: agency.id,
      event: 'AGENCY_CREATED',
      actorId: null,
      actorRole: 'SYSTEM',
      after: { applicationId, legalName: agency.legalName },
    });
    return agency;
  });
}

export interface SetCommercialConfigInput {
  tier: string;
  overrides?: CommercialOverrides;
}

export interface CommercialConfigResult {
  agency: Agency;
  configuration: CommercialConfiguration;
}

/**
 * Assigns/updates an agency's commercial terms from a tier preset + overrides.
 * Creates the Agency on first call, versions the configuration (only one
 * isCurrent per agency), and moves the application APPROVED →
 * COMMERCIAL_CONFIGURATION on the first assignment.
 */
export async function setCommercialConfig(
  applicationId: string,
  input: SetCommercialConfigInput,
  actor: Actor,
): Promise<CommercialConfigResult> {
  const application = await prisma.agencyApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw ApiError.notFound('Application not found');
  if (application.lifecycleState !== 'APPROVED' && application.lifecycleState !== 'COMMERCIAL_CONFIGURATION') {
    throw ApiError.conflict('Commercial configuration is only available for approved applications');
  }

  const preset = getTierPreset(input.tier);
  if (!preset) {
    throw ApiError.badRequest(`Unknown tier: ${input.tier}`);
  }
  const terms = resolveCommercialTerms(preset, input.overrides);

  const agency = await ensureAgency(applicationId);

  const configuration = await prisma.$transaction(async (tx) => {
    await tx.commercialConfiguration.updateMany({
      where: { agencyId: agency.id, isCurrent: true },
      data: { isCurrent: false },
    });
    const created = await tx.commercialConfiguration.create({
      data: {
        agencyId: agency.id,
        tier: input.tier.toUpperCase(),
        paymentMode: terms.paymentMode,
        creditLimit: terms.creditLimit,
        paymentTerms: terms.paymentTerms,
        markupPct: terms.markupPct,
        effectiveFrom: new Date(),
        updatedById: actor.actorId,
        isCurrent: true,
      },
    });
    await recordAuditLog(
      {
        entityType: 'CommercialConfiguration',
        entityId: created.id,
        event: 'COMMERCIAL_CONFIG_SET',
        actorId: actor.actorId,
        actorRole: actor.actorRole,
        after: { tier: created.tier, ...terms },
      },
      tx,
    );
    return created;
  });

  if (application.lifecycleState === 'APPROVED') {
    await transitionApplication(applicationId, 'COMMERCIAL_CONFIGURATION', actor, {
      reason: 'Commercial terms assigned',
    });
  }

  return { agency, configuration };
}

/** Returns the current commercial configuration for an agency (or null). */
export async function getCurrentConfig(agencyId: string): Promise<CommercialConfiguration | null> {
  return prisma.commercialConfiguration.findFirst({
    where: { agencyId, isCurrent: true },
  });
}
