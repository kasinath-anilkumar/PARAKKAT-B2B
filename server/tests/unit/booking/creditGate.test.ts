import { describe, expect, it } from 'vitest';
import { evaluateCreditGate } from '../../../src/modules/booking/creditGate';

describe('unified credit gate', () => {
  it('confirms on credit when projected balance is within the limit', () => {
    const d = evaluateCreditGate({
      paymentMode: 'CREDIT',
      outstandingBalance: 10000,
      agencyPrice: 4950,
      effectiveCreditLimit: 50000,
    });
    expect(d.branch).toBe('confirm_on_credit');
    expect(d.projectedBalance).toBe(14950);
  });

  it('pays first when projected balance exceeds the limit (over-limit credit, D3)', () => {
    const d = evaluateCreditGate({
      paymentMode: 'CREDIT',
      outstandingBalance: 48000,
      agencyPrice: 4950,
      effectiveCreditLimit: 50000,
    });
    expect(d.branch).toBe('pay_first');
  });

  it('treats the boundary (projected == limit) as within limit', () => {
    const d = evaluateCreditGate({
      paymentMode: 'CREDIT',
      outstandingBalance: 45050,
      agencyPrice: 4950,
      effectiveCreditLimit: 50000,
    });
    expect(d.projectedBalance).toBe(50000);
    expect(d.branch).toBe('confirm_on_credit');
  });

  it('prepay always pays first — even with a stored non-zero limit and zero balance', () => {
    const d = evaluateCreditGate({
      paymentMode: 'PREPAY',
      outstandingBalance: 0,
      agencyPrice: 100,
      effectiveCreditLimit: 999999,
    });
    expect(d.branch).toBe('pay_first');
    expect(d.effectiveCreditLimit).toBe(0);
  });

  it('credit agency with ₹0 limit pays first', () => {
    const d = evaluateCreditGate({
      paymentMode: 'CREDIT',
      outstandingBalance: 0,
      agencyPrice: 1,
      effectiveCreditLimit: 0,
    });
    expect(d.branch).toBe('pay_first');
  });
});
