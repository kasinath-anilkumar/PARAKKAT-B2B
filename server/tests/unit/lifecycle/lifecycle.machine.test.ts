import { describe, expect, it } from 'vitest';
import {
  allowedNextStates,
  canTransition,
  validateTransition,
} from '../../../src/modules/lifecycle/lifecycle.machine';

describe('lifecycle machine — legal transitions', () => {
  it('allows an applicant to submit a draft (DRAFT → VERIFICATION)', () => {
    expect(canTransition('DRAFT', 'VERIFICATION', 'APPLICANT')).toBe(true);
    expect(canTransition('DRAFT', 'VERIFICATION', 'ADMIN')).toBe(true);
  });

  it('allows a verifier to approve or reject from REVIEW', () => {
    expect(canTransition('REVIEW', 'APPROVED', 'VERIFIER')).toBe(true);
    expect(canTransition('REVIEW', 'REJECTED', 'VERIFIER')).toBe(true);
  });

  it('allows admin to suspend and reactivate', () => {
    expect(canTransition('ACTIVE', 'SUSPENDED', 'ADMIN')).toBe(true);
    expect(canTransition('SUSPENDED', 'ACTIVE', 'ADMIN')).toBe(true);
  });
});

describe('lifecycle machine — illegal transitions', () => {
  it('rejects skipping states (DRAFT → ACTIVE)', () => {
    expect(canTransition('DRAFT', 'ACTIVE', 'ADMIN')).toBe(false);
    expect(validateTransition('DRAFT', 'ACTIVE', 'ADMIN')).toMatchObject({
      kind: 'invalid_transition',
    });
  });

  it('rejects transitions out of a terminal state (REJECTED → anything)', () => {
    expect(canTransition('REJECTED', 'REVIEW', 'ADMIN')).toBe(false);
    expect(canTransition('REJECTED', 'VERIFICATION', 'APPLICANT')).toBe(false);
  });

  it('rejects an unpermitted actor on an otherwise-legal transition', () => {
    // AGENT may never move an application through the pipeline.
    expect(canTransition('DRAFT', 'VERIFICATION', 'AGENT')).toBe(false);
    expect(validateTransition('REVIEW', 'APPROVED', 'AGENT')).toMatchObject({
      kind: 'forbidden_actor',
    });
    // Applicant cannot approve their own application.
    expect(canTransition('REVIEW', 'APPROVED', 'APPLICANT')).toBe(false);
  });
});

describe('allowedNextStates', () => {
  it('returns the decision branches + re-verification from REVIEW', () => {
    expect(allowedNextStates('REVIEW').sort()).toEqual(['APPROVED', 'REJECTED', 'VERIFICATION']);
  });

  it('returns nothing from a terminal state', () => {
    expect(allowedNextStates('REJECTED')).toEqual([]);
  });
});
