import { describe, expect, it } from 'vitest';
import { computeCancellation } from '../../../src/modules/finance/cancellation';

const price = 10000;

describe('cancellation policy (default bands)', () => {
  it('full refund 7+ days before check-in', () => {
    const o = computeCancellation(price, new Date('2026-08-20'), new Date('2026-08-01'));
    expect(o.chargePct).toBe(0);
    expect(o.chargeAmount).toBe(0);
    expect(o.refundAmount).toBe(10000);
  });

  it('25% charge 3–6 days before', () => {
    const o = computeCancellation(price, new Date('2026-08-20'), new Date('2026-08-15'));
    expect(o.chargePct).toBe(25);
    expect(o.chargeAmount).toBe(2500);
    expect(o.refundAmount).toBe(7500);
  });

  it('50% charge 1–2 days before', () => {
    const o = computeCancellation(price, new Date('2026-08-20'), new Date('2026-08-19'));
    expect(o.chargePct).toBe(50);
    expect(o.refundAmount).toBe(5000);
  });

  it('100% charge same day / no-show', () => {
    const o = computeCancellation(price, new Date('2026-08-20'), new Date('2026-08-20'));
    expect(o.chargePct).toBe(100);
    expect(o.chargeAmount).toBe(10000);
    expect(o.refundAmount).toBe(0);
  });

  it('respects a custom band set', () => {
    const bands = [
      { minDaysBefore: 2, chargePct: 10 },
      { minDaysBefore: 0, chargePct: 80 },
    ];
    const o = computeCancellation(price, new Date('2026-08-20'), new Date('2026-08-19'), bands);
    expect(o.chargePct).toBe(80); // 1 day before → falls to the 0-day band
  });
});
