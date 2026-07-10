import { describe, expect, it } from 'vitest';
import { maskAadhaarRef, maskAccount, maskPan, maskTail } from '../../../src/utils/mask';

describe('mask utils', () => {
  it('masks all but the last N characters', () => {
    expect(maskTail('1234567890', 4)).toBe('******7890');
  });

  it('fully masks values shorter than the visible count', () => {
    expect(maskTail('abc', 4)).toBe('***');
  });

  it('masks PAN keeping last 4', () => {
    expect(maskPan('ABCDE1234F')).toBe('******234F');
  });

  it('masks bank account keeping last 4', () => {
    expect(maskAccount('000123456789')).toBe('********6789');
  });

  it('masks aadhaar reference keeping last 4', () => {
    expect(maskAadhaarRef('aadhaar-ref-9876')).toBe('************9876');
  });

  it('passes through null/undefined', () => {
    expect(maskTail(null)).toBeNull();
    expect(maskTail(undefined)).toBeNull();
  });
});
