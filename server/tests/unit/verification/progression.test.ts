import { describe, expect, it } from 'vitest';
import type { VerificationStatus } from '@prisma/client';
import { decideProgression } from '../../../src/modules/verification/verification.progression';

const EXPECTED = 5;

function statuses(...s: VerificationStatus[]): VerificationStatus[] {
  return s;
}

describe('decideProgression', () => {
  it('waits when not all checks exist yet', () => {
    expect(decideProgression(statuses('PASSED', 'PASSED'), EXPECTED)).toEqual({ action: 'wait' });
  });

  it('waits when a check is still in progress', () => {
    expect(
      decideProgression(statuses('PASSED', 'PASSED', 'PASSED', 'PASSED', 'IN_PROGRESS'), EXPECTED),
    ).toEqual({ action: 'wait' });
  });

  it('waits when a check is still pending', () => {
    expect(
      decideProgression(statuses('PASSED', 'PASSED', 'PASSED', 'PASSED', 'PENDING'), EXPECTED),
    ).toEqual({ action: 'wait' });
  });

  it('progresses cleanly when all checks passed', () => {
    expect(
      decideProgression(statuses('PASSED', 'PASSED', 'PASSED', 'PASSED', 'PASSED'), EXPECTED),
    ).toEqual({ action: 'progress_clean' });
  });

  it('progresses flagged when a check failed', () => {
    expect(
      decideProgression(statuses('PASSED', 'PASSED', 'PASSED', 'PASSED', 'FAILED'), EXPECTED),
    ).toEqual({ action: 'progress_flagged' });
  });

  it('progresses flagged when a check needs manual review', () => {
    expect(
      decideProgression(
        statuses('PASSED', 'PASSED', 'PASSED', 'MANUAL_REVIEW', 'PASSED'),
        EXPECTED,
      ),
    ).toEqual({ action: 'progress_flagged' });
  });

  it('progresses cleanly for independent agent when all 4 checks passed', () => {
    expect(
      decideProgression(statuses('PASSED', 'PASSED', 'PASSED', 'PASSED'), 4),
    ).toEqual({ action: 'progress_clean' });
  });

  it('waits for independent agent when only 3 checks passed', () => {
    expect(
      decideProgression(statuses('PASSED', 'PASSED', 'PASSED'), 4),
    ).toEqual({ action: 'wait' });
  });
});
