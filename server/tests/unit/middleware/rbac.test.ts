import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  requireMfaSatisfied,
  requireOwnAgency,
  requireRole,
  scopeToAgency,
} from '../../../src/middleware/rbac';
import type { AuthUser } from '../../../src/types/express';

function makeReq(user?: AuthUser, params: Record<string, string> = {}): Request {
  return { user, params } as unknown as Request;
}

function makeNext() {
  return vi.fn();
}

describe('requireRole', () => {
  const roles: AuthUser['role'][] = ['ADMIN', 'VERIFIER', 'AGENCY', 'AGENT'];

  it.each(roles)('allows %s when it is in the allowed list', (role) => {
    const req = makeReq({ id: 'u1', role, agencyId: null, mfaVerified: true });
    const next = makeNext();
    requireRole(role)(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it.each(roles)('denies %s when it is not in the allowed list', (role) => {
    const other = roles.find((r) => r !== role)!;
    const req = makeReq({ id: 'u1', role, agencyId: null, mfaVerified: true });
    const next = makeNext();
    requireRole(other)(req, {} as Response, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('rejects unauthenticated requests with 401', () => {
    const req = makeReq(undefined);
    const next = makeNext();
    requireRole('ADMIN')(req, {} as Response, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });
});

describe('requireOwnAgency', () => {
  it('allows ADMIN across any agency', () => {
    const req = makeReq({ id: 'a1', role: 'ADMIN', agencyId: null, mfaVerified: true }, { id: 'agency-other' });
    const next = makeNext();
    requireOwnAgency((r) => r.params.id)(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows VERIFIER across any agency', () => {
    const req = makeReq({ id: 'v1', role: 'VERIFIER', agencyId: null, mfaVerified: true }, { id: 'agency-other' });
    const next = makeNext();
    requireOwnAgency((r) => r.params.id)(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows AGENCY when the target agency matches their own', () => {
    const req = makeReq(
      { id: 'ag1', role: 'AGENCY', agencyId: 'agency-1', mfaVerified: true },
      { id: 'agency-1' },
    );
    const next = makeNext();
    requireOwnAgency((r) => r.params.id)(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('denies AGENCY when the target agency does not match their own', () => {
    const req = makeReq(
      { id: 'ag1', role: 'AGENCY', agencyId: 'agency-1', mfaVerified: true },
      { id: 'agency-2' },
    );
    const next = makeNext();
    requireOwnAgency((r) => r.params.id)(req, {} as Response, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('denies AGENT when the target agency does not match their own', () => {
    const req = makeReq(
      { id: 'agt1', role: 'AGENT', agencyId: 'agency-1', mfaVerified: true },
      { id: 'agency-2' },
    );
    const next = makeNext();
    requireOwnAgency((r) => r.params.id)(req, {} as Response, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });
});

describe('requireMfaSatisfied', () => {
  it('passes when mfaVerified is true', () => {
    const req = makeReq({ id: 'u1', role: 'AGENT', agencyId: 'a1', mfaVerified: true });
    const next = makeNext();
    requireMfaSatisfied(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('denies when mfaVerified is false', () => {
    const req = makeReq({ id: 'u1', role: 'AGENT', agencyId: 'a1', mfaVerified: false });
    const next = makeNext();
    requireMfaSatisfied(req, {} as Response, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });
});

describe('scopeToAgency', () => {
  it('is a no-op for ADMIN', () => {
    const user: AuthUser = { id: 'a1', role: 'ADMIN', agencyId: null, mfaVerified: true };
    expect(scopeToAgency({ status: 'ACTIVE' }, user)).toEqual({ status: 'ACTIVE' });
  });

  it('is a no-op for VERIFIER', () => {
    const user: AuthUser = { id: 'v1', role: 'VERIFIER', agencyId: null, mfaVerified: true };
    expect(scopeToAgency({ status: 'ACTIVE' }, user)).toEqual({ status: 'ACTIVE' });
  });

  it('merges agencyId for AGENCY', () => {
    const user: AuthUser = { id: 'ag1', role: 'AGENCY', agencyId: 'agency-1', mfaVerified: true };
    expect(scopeToAgency({ status: 'ACTIVE' }, user)).toEqual({
      status: 'ACTIVE',
      agencyId: 'agency-1',
    });
  });

  it('merges agencyId for AGENT', () => {
    const user: AuthUser = { id: 'agt1', role: 'AGENT', agencyId: 'agency-1', mfaVerified: true };
    expect(scopeToAgency({ status: 'ACTIVE' }, user)).toEqual({
      status: 'ACTIVE',
      agencyId: 'agency-1',
    });
  });
});
