import { describe, expect, it } from 'vitest';
import {
  issueAccessToken,
  issueMfaPendingToken,
  verifyAccessToken,
  verifyMfaPendingToken,
} from '../../../src/modules/auth/token.service';

// Refresh-token issue/rotate/reuse-detection is DB-backed and covered by
// tests/integration/auth.flow.test.ts against a real database. These are
// the pure-JWT pieces, testable without any external dependency.

describe('token.service (JWT)', () => {
  it('issues and verifies an access token with the expected claims', () => {
    const token = issueAccessToken({
      id: 'user-1',
      role: 'AGENCY',
      agencyId: 'agency-1',
      mfaVerified: true,
    });
    const decoded = verifyAccessToken(token);
    expect(decoded).toMatchObject({
      sub: 'user-1',
      role: 'AGENCY',
      agencyId: 'agency-1',
      mfaVerified: true,
      type: 'access',
    });
  });

  it('rejects a tampered access token', () => {
    const token = issueAccessToken({
      id: 'user-1',
      role: 'AGENT',
      agencyId: 'agency-1',
      mfaVerified: true,
    });
    expect(() => verifyAccessToken(`${token}tampered`)).toThrow();
  });

  it('issues and verifies an MFA-pending token', () => {
    const token = issueMfaPendingToken('user-2');
    const decoded = verifyMfaPendingToken(token);
    expect(decoded).toMatchObject({ sub: 'user-2', type: 'mfa_pending' });
  });

  it('an access token cannot be verified as an MFA-pending token and vice versa', () => {
    const accessToken = issueAccessToken({
      id: 'user-3',
      role: 'ADMIN',
      agencyId: null,
      mfaVerified: true,
    });
    expect(() => verifyMfaPendingToken(accessToken)).toThrow();

    const mfaToken = issueMfaPendingToken('user-3');
    expect(() => verifyAccessToken(mfaToken)).toThrow();
  });
});
