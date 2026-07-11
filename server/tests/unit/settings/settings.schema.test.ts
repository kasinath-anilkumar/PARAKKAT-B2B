import { describe, expect, it } from 'vitest';
import {
  GROUP_SCHEMAS,
  bookingSchema,
  companySchema,
  financialSchema,
  groupParamSchema,
  portalSchema,
  securitySchema,
} from '../../../src/modules/settings/settings.schema';

// The System-Settings PUT body is validated per group against these schemas.
describe('settings schemas', () => {
  it('exposes a schema for every settings group', () => {
    expect(Object.keys(GROUP_SCHEMAS).sort()).toEqual(['booking', 'company', 'financial', 'portal', 'security']);
  });

  describe('groupParamSchema', () => {
    it('accepts known groups and rejects unknown ones', () => {
      expect(groupParamSchema.safeParse({ group: 'security' }).success).toBe(true);
      expect(groupParamSchema.safeParse({ group: 'bogus' }).success).toBe(false);
    });
  });

  describe('company', () => {
    it('accepts a partial patch', () => {
      expect(companySchema.safeParse({ name: 'Parakkat' }).success).toBe(true);
    });
    it('rejects a malformed email', () => {
      expect(companySchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    });
  });

  describe('financial', () => {
    it('rejects a GST rate above 28%', () => {
      expect(financialSchema.safeParse({ defaultGstRate: 40 }).success).toBe(false);
    });
    it('rejects an invoice format that is too short', () => {
      expect(financialSchema.safeParse({ invoiceNumberFormat: 'x' }).success).toBe(false);
    });
    it('accepts a valid invoice format', () => {
      expect(financialSchema.safeParse({ invoiceNumberFormat: 'INV-{YYYY}-{RAND}' }).success).toBe(true);
    });
  });

  describe('booking', () => {
    it('rejects a booking window outside 1..1095 days', () => {
      expect(bookingSchema.safeParse({ bookingWindowDays: 0 }).success).toBe(false);
      expect(bookingSchema.safeParse({ bookingWindowDays: 2000 }).success).toBe(false);
    });
    it('accepts a sensible window', () => {
      expect(bookingSchema.safeParse({ bookingWindowDays: 180 }).success).toBe(true);
    });
  });

  describe('portal', () => {
    it('requires maintenanceMode to be boolean', () => {
      expect(portalSchema.safeParse({ maintenanceMode: true }).success).toBe(true);
      expect(portalSchema.safeParse({ maintenanceMode: 'yes' }).success).toBe(false);
    });
  });

  describe('security', () => {
    it('accepts boolean MFA flags', () => {
      expect(securitySchema.safeParse({ mfaEnabled: true, enforceAdmin: false }).success).toBe(true);
    });
    it('rejects a non-boolean flag', () => {
      expect(securitySchema.safeParse({ mfaEnabled: 'true' }).success).toBe(false);
    });
  });
});
