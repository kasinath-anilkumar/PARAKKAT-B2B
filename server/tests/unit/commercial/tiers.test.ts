import { describe, expect, it } from 'vitest';
import { getTierPreset, listTierNames, saveTiers, getTiers } from '../../../src/modules/commercial/tiers';

describe('tier presets', () => {
  it('exposes the built-in tiers A, B, C', () => {
    const names = listTierNames();
    expect(names).toContain('A');
    expect(names).toContain('B');
    expect(names).toContain('C');
  });

  it('is case-insensitive on tier name', () => {
    expect(getTierPreset('a')).toEqual(getTierPreset('A'));
  });

  it('C tier is prepay with a zero credit limit', () => {
    const prepaid = getTierPreset('C');
    expect(prepaid?.paymentMode).toBe('PREPAY');
    expect(prepaid?.creditLimit).toBe(0);
  });

  it('returns undefined for an unknown tier', () => {
    expect(getTierPreset('NOPE')).toBeUndefined();
  });

  it('saves and updates dynamic tiers', () => {
    const original = { ...getTiers() };
    try {
      const updated = {
        ...original,
        A: { ...original.A, creditLimit: 5000000 },
      };
      saveTiers(updated);
      expect(getTierPreset('A')?.creditLimit).toBe(5000000);
    } finally {
      saveTiers(original);
    }
  });
});
