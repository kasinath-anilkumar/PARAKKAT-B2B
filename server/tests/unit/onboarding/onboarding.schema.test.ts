import { describe, expect, it } from 'vitest';
import {
  draftInputSchema,
  gstinSchema,
  ifscSchema,
  panSchema,
  submitApplicationSchema,
} from '../../../src/modules/onboarding/onboarding.schema';

describe('onboarding field validators', () => {
  it('accepts a well-formed GSTIN and rejects malformed ones', () => {
    expect(gstinSchema.safeParse('27AABCU9603R1ZM').success).toBe(true);
    expect(gstinSchema.safeParse('not-a-gstin').success).toBe(false);
    expect(gstinSchema.safeParse('27AABCU9603R1Z').success).toBe(false); // too short
  });

  it('accepts a well-formed PAN and rejects malformed ones', () => {
    expect(panSchema.safeParse('AABCU9603R').success).toBe(true);
    expect(panSchema.safeParse('AABC9603R').success).toBe(false);
  });

  it('accepts a well-formed IFSC and rejects malformed ones', () => {
    expect(ifscSchema.safeParse('HDFC0001234').success).toBe(true);
    expect(ifscSchema.safeParse('HDFC1001234').success).toBe(false); // 5th char must be 0
  });
});

describe('draftInputSchema (partial)', () => {
  it('accepts an empty object (draft can be blank)', () => {
    expect(draftInputSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a partial draft', () => {
    expect(draftInputSchema.safeParse({ legalName: 'Acme Travels' }).success).toBe(true);
  });

  it('still validates the shape of provided fields', () => {
    expect(draftInputSchema.safeParse({ gstin: 'bad' }).success).toBe(false);
  });
});

describe('submitApplicationSchema (full)', () => {
  const complete = {
    legalName: 'Acme Travels Pvt Ltd',
    gstin: '27AABCU9603R1ZM',
    pan: 'AABCU9603R',
    addressLine1: '1 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
    businessContactEmail: 'ops@acmetravels.example',
    businessContactPhone: '9876543210',
    repName: 'Priya Sharma',
    repDesignation: 'Director',
    repEmail: 'priya@acmetravels.example',
    repMobile: '9876543211',
    repAadhaarRef: 'aadhaar-ref-token-123',
    bankAccount: '000123456789',
    ifsc: 'HDFC0001234',
    accountHolder: 'Acme Travels Pvt Ltd',
  };

  it('accepts a complete application (addressLine2 optional)', () => {
    expect(submitApplicationSchema.safeParse(complete).success).toBe(true);
  });

  it('rejects a submission missing required fields', () => {
    const { pan: _omit, ...missingPan } = complete;
    void _omit;
    expect(submitApplicationSchema.safeParse(missingPan).success).toBe(false);
  });
});
