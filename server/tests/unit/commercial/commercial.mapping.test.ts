import { describe, expect, it } from 'vitest';
import type { AgencyApplication } from '@prisma/client';
import {
  mapApplicationToAgencyData,
  resolveCommercialTerms,
} from '../../../src/modules/commercial/commercial.mapping';
import type { TierPreset } from '../../../src/modules/commercial/tiers';

const creditPreset: TierPreset = {
  paymentMode: 'CREDIT',
  creditLimit: 500000,
  paymentTerms: 'net 30',
  markupPct: 6,
};

describe('resolveCommercialTerms', () => {
  it('returns the preset when there are no overrides', () => {
    expect(resolveCommercialTerms(creditPreset)).toEqual({
      paymentMode: 'CREDIT',
      creditLimit: 500000,
      paymentTerms: 'net 30',
      markupPct: 6,
    });
  });

  it('applies overrides', () => {
    expect(resolveCommercialTerms(creditPreset, { markupPct: 9, creditLimit: 250000 })).toEqual({
      paymentMode: 'CREDIT',
      creditLimit: 250000,
      paymentTerms: 'net 30',
      markupPct: 9,
    });
  });

  it('forces credit limit to 0 for a prepay agency, ignoring any override', () => {
    const resolved = resolveCommercialTerms(creditPreset, {
      paymentMode: 'PREPAY',
      creditLimit: 999999,
    });
    expect(resolved.paymentMode).toBe('PREPAY');
    expect(resolved.creditLimit).toBe(0);
  });
});

describe('mapApplicationToAgencyData', () => {
  const base = {
    id: 'app-1',
    legalName: 'Acme Travels',
    gstin: '27AABCU9603R1ZM',
    pan: 'AABCU9603R',
    businessContactEmail: 'ops@acme.example',
    businessContactPhone: '9876543210',
    repEmail: 'rep@acme.example',
    repMobile: '9876500000',
  } as unknown as AgencyApplication;

  it('maps the required agency fields', () => {
    expect(mapApplicationToAgencyData(base)).toEqual({
      legalName: 'Acme Travels',
      gstin: '27AABCU9603R1ZM',
      pan: 'AABCU9603R',
      contactEmail: 'ops@acme.example',
      contactPhone: '9876543210',
    });
  });

  it('falls back to the representative contact when business contact is absent', () => {
    const app = { ...base, businessContactEmail: null, businessContactPhone: null } as AgencyApplication;
    const data = mapApplicationToAgencyData(app);
    expect(data.contactEmail).toBe('rep@acme.example');
    expect(data.contactPhone).toBe('9876500000');
  });

  it('throws when required fields are missing', () => {
    const app = { ...base, legalName: null, gstin: null } as AgencyApplication;
    expect(() => mapApplicationToAgencyData(app)).toThrow(/missing/);
  });
});
