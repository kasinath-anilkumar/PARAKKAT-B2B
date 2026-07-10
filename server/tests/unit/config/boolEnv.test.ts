import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Mirror of the boolEnv helper in src/config/env.ts. Guards against the
// z.coerce.boolean() pitfall where the string "false" coerces to true.
const boolEnv = (defaultVal: boolean) =>
  z.preprocess((v) => {
    if (v === undefined || v === '') return defaultVal;
    if (typeof v === 'boolean') return v;
    return ['true', '1', 'yes', 'on'].includes(String(v).trim().toLowerCase());
  }, z.boolean());

describe('boolEnv', () => {
  it('parses truthy strings as true', () => {
    for (const v of ['true', 'TRUE', '1', 'yes', 'on', ' true ']) {
      expect(boolEnv(false).parse(v)).toBe(true);
    }
  });

  it('parses falsey strings as false (the coerce.boolean bug)', () => {
    for (const v of ['false', 'FALSE', '0', 'no', 'off', 'anything-else']) {
      expect(boolEnv(true).parse(v)).toBe(false);
    }
  });

  it('uses the default when unset or empty', () => {
    expect(boolEnv(true).parse(undefined)).toBe(true);
    expect(boolEnv(false).parse(undefined)).toBe(false);
    expect(boolEnv(true).parse('')).toBe(true);
  });
});
