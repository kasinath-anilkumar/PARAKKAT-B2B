import { describe, expect, it } from 'vitest';
import { computeAgencyPrice, nightsBetween } from '../../../src/modules/booking/pricing';

describe('nightsBetween', () => {
  it('counts nights between two dates', () => {
    expect(nightsBetween(new Date('2026-08-01'), new Date('2026-08-04'))).toBe(3);
    expect(nightsBetween(new Date('2026-08-01'), new Date('2026-08-02'))).toBe(1);
  });
});

describe('computeAgencyPrice', () => {
  it('applies markup to the base total (spec example: 4500 base, 10% → 4950)', () => {
    const p = computeAgencyPrice(4500, 1, 10);
    expect(p.baseTotal).toBe(4500);
    expect(p.agencyPrice).toBe(4950);
  });

  it('multiplies base rate across nights before markup', () => {
    const p = computeAgencyPrice(5000, 3, 8);
    expect(p.baseTotal).toBe(15000);
    expect(p.agencyPrice).toBe(16200);
  });

  it('rounds the agency price to 2 decimals', () => {
    const p = computeAgencyPrice(4333.33, 1, 7.5);
    expect(p.agencyPrice).toBe(4658.33);
  });

  it('handles a zero markup', () => {
    const p = computeAgencyPrice(6800, 2, 0);
    expect(p.agencyPrice).toBe(13600);
  });

  it('rejects a non-positive stay', () => {
    expect(() => computeAgencyPrice(4500, 0, 10)).toThrow();
  });
});
