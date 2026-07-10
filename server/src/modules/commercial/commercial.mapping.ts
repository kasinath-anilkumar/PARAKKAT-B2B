import type { AgencyApplication, PaymentMode } from '@prisma/client';
import type { TierPreset } from './tiers';

export interface CommercialOverrides {
  paymentMode?: PaymentMode;
  creditLimit?: number;
  paymentTerms?: string;
  markupPct?: number;
}

export interface ResolvedTerms {
  paymentMode: PaymentMode;
  creditLimit: number;
  paymentTerms: string;
  markupPct: number;
}

/**
 * Resolves the four per-agency commercial values from a tier preset plus
 * optional overrides. Invariant (§9): a PREPAY agency always has an effective
 * credit limit of ₹0, regardless of any override.
 */
export function resolveCommercialTerms(
  preset: TierPreset,
  overrides: CommercialOverrides = {},
): ResolvedTerms {
  const paymentMode = overrides.paymentMode ?? preset.paymentMode;
  const creditLimit =
    paymentMode === 'PREPAY' ? 0 : (overrides.creditLimit ?? preset.creditLimit);
  return {
    paymentMode,
    creditLimit,
    paymentTerms: overrides.paymentTerms ?? preset.paymentTerms,
    markupPct: overrides.markupPct ?? preset.markupPct,
  };
}

export interface AgencyCreateData {
  legalName: string;
  gstin: string;
  pan: string;
  contactEmail: string;
  contactPhone: string;
}

/** Maps a fully-populated application to the Agency record's scalar fields. */
export function mapApplicationToAgencyData(application: AgencyApplication): AgencyCreateData {
  const missing: string[] = [];
  if (!application.legalName) missing.push('legalName');
  if (!application.gstin) missing.push('gstin');
  if (!application.pan) missing.push('pan');
  const contactEmail = application.businessContactEmail ?? application.repEmail;
  const contactPhone = application.businessContactPhone ?? application.repMobile;
  if (!contactEmail) missing.push('contactEmail');
  if (!contactPhone) missing.push('contactPhone');
  if (missing.length > 0) {
    throw new Error(`Application is missing fields required to create an agency: ${missing.join(', ')}`);
  }
  return {
    legalName: application.legalName!,
    gstin: application.gstin!,
    pan: application.pan!,
    contactEmail: contactEmail!,
    contactPhone: contactPhone!,
  };
}
