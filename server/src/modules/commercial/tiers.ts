import type { PaymentMode } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

export interface TierPreset {
  paymentMode: PaymentMode;
  creditLimit: number;
  paymentTerms: string;
  markupPct: number;
}

// Built-in defaults. Overridable via TIERS_CONFIG_JSON (§16 — presets are
// configuration, not hardcoded business rules). A prepay tier always implies
// an effective credit limit of ₹0.
const DEFAULT_TIERS: Record<string, TierPreset> = {
  STANDARD: { paymentMode: 'CREDIT', creditLimit: 100000, paymentTerms: 'net 15', markupPct: 10 },
  SILVER: { paymentMode: 'CREDIT', creditLimit: 250000, paymentTerms: 'net 30', markupPct: 8 },
  GOLD: { paymentMode: 'CREDIT', creditLimit: 500000, paymentTerms: 'net 30', markupPct: 6 },
  PREPAID: { paymentMode: 'PREPAY', creditLimit: 0, paymentTerms: 'prepaid', markupPct: 12 },
};

let cached: Record<string, TierPreset> | undefined;

export function getTiers(): Record<string, TierPreset> {
  if (cached) return cached;
  cached = { ...DEFAULT_TIERS };
  if (env.TIERS_CONFIG_JSON) {
    try {
      const parsed = JSON.parse(env.TIERS_CONFIG_JSON) as Record<string, TierPreset>;
      cached = { ...cached, ...parsed };
    } catch {
      logger.error('TIERS_CONFIG_JSON is not valid JSON; using built-in tier presets');
    }
  }
  return cached;
}

export function getTierPreset(tier: string): TierPreset | undefined {
  return getTiers()[tier.toUpperCase()];
}

export function listTierNames(): string[] {
  return Object.keys(getTiers());
}
