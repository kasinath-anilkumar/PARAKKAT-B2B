import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '@prisma/client';

// isMfaRequiredForRole reads the runtime MFA policy from the settings cache; we
// mock that so the enforcement matrix can be tested in isolation.
vi.mock('../../../src/modules/settings/settings.service', () => ({
  getMfaPolicy: vi.fn(),
  isMaintenanceMode: vi.fn(() => false),
}));

import { isMfaRequiredForRole } from '../../../src/modules/auth/auth.service';
import { getMfaPolicy } from '../../../src/modules/settings/settings.service';

const mockPolicy = getMfaPolicy as unknown as ReturnType<typeof vi.fn>;
const setPolicy = (p: { mfaEnabled: boolean; enforceAdmin: boolean; enforceAgency: boolean; enforceAgent: boolean }) =>
  mockPolicy.mockReturnValue(p);
const OFF = { mfaEnabled: false, enforceAdmin: false, enforceAgency: false, enforceAgent: false };

describe('isMfaRequiredForRole', () => {
  beforeEach(() => mockPolicy.mockReset());

  it('never requires MFA when the master switch is off — even for enforced roles or opted-in users', () => {
    setPolicy({ ...OFF, mfaEnabled: false, enforceAdmin: true });
    expect(isMfaRequiredForRole('ADMIN' as Role, true)).toBe(false);
    expect(isMfaRequiredForRole('AGENCY' as Role, true)).toBe(false);
  });

  it('enforces ADMIN and VERIFIER when enforceAdmin is on', () => {
    setPolicy({ ...OFF, mfaEnabled: true, enforceAdmin: true });
    expect(isMfaRequiredForRole('ADMIN' as Role, false)).toBe(true);
    expect(isMfaRequiredForRole('VERIFIER' as Role, false)).toBe(true);
    // other roles not forced, and not opted in
    expect(isMfaRequiredForRole('AGENCY' as Role, false)).toBe(false);
    expect(isMfaRequiredForRole('AGENT' as Role, false)).toBe(false);
  });

  it('enforces AGENCY only when enforceAgency is on', () => {
    setPolicy({ ...OFF, mfaEnabled: true, enforceAgency: true });
    expect(isMfaRequiredForRole('AGENCY' as Role, false)).toBe(true);
    expect(isMfaRequiredForRole('ADMIN' as Role, false)).toBe(false);
  });

  it('enforces AGENT only when enforceAgent is on', () => {
    setPolicy({ ...OFF, mfaEnabled: true, enforceAgent: true });
    expect(isMfaRequiredForRole('AGENT' as Role, false)).toBe(true);
    expect(isMfaRequiredForRole('AGENCY' as Role, false)).toBe(false);
  });

  it('honours a user opt-in when their role is not force-enrolled', () => {
    setPolicy({ ...OFF, mfaEnabled: true });
    expect(isMfaRequiredForRole('AGENT' as Role, true)).toBe(true); // opted in
    expect(isMfaRequiredForRole('AGENT' as Role, false)).toBe(false); // not opted in
  });
});
