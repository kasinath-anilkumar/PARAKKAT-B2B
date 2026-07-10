import { describe, expect, it } from 'vitest';
import { getTierPreset, listTierNames } from '../../../src/modules/commercial/tiers';

describe('tier presets', () => {
  it('exposes the built-in tiers', () => {
    const names = listTierNames();
    expect(names).toContain('STANDARD');
    expect(names).toContain('GOLD');
    expect(names).toContain('PREPAID');
  });

  it('is case-insensitive on tier name', () => {
    expect(getTierPreset('gold')).toEqual(getTierPreset('GOLD'));
  });

  it('PREPAID tier is prepay with a zero credit limit', () => {
    const prepaid = getTierPreset('PREPAID');
    expect(prepaid?.paymentMode).toBe('PREPAY');
    expect(prepaid?.creditLimit).toBe(0);
  });

  it('returns undefined for an unknown tier', () => {
    expect(getTierPreset('NOPE')).toBeUndefined();
  });
});
