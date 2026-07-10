import type { PaymentMode } from '@prisma/client';

/**
 * The unified credit gate (Instructions.md §10 / §4.11). ONE gate, not two
 * flows — everything routes through this single function.
 *
 *   Confirm on credit if:
 *     (agency outstanding balance + this booking's agency price)
 *       ≤ agency effective credit limit
 *   otherwise collect payment first.
 *
 * Consequences that fall out of the single rule (no special-casing):
 *   - a PREPAY agency has an effective limit of ₹0, so it always pays first
 *   - a CREDIT agency over its limit pays first for that booking (Decision D3)
 */

export interface CreditGateInput {
  paymentMode: PaymentMode;
  /** Agency's current outstanding balance owed on credit. */
  outstandingBalance: number;
  /** This booking's agency price. */
  agencyPrice: number;
  /** Resolved effective credit limit (₹0 for prepay). */
  effectiveCreditLimit: number;
}

export type CreditGateBranch = 'confirm_on_credit' | 'pay_first';

export interface CreditGateDecision {
  branch: CreditGateBranch;
  projectedBalance: number;
  effectiveCreditLimit: number;
}

export function evaluateCreditGate(input: CreditGateInput): CreditGateDecision {
  // Prepay always implies a ₹0 effective limit regardless of any stored value.
  const effectiveCreditLimit = input.paymentMode === 'PREPAY' ? 0 : input.effectiveCreditLimit;
  const projectedBalance = input.outstandingBalance + input.agencyPrice;
  const branch: CreditGateBranch =
    projectedBalance <= effectiveCreditLimit ? 'confirm_on_credit' : 'pay_first';
  return { branch, projectedBalance, effectiveCreditLimit };
}
