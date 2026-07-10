import type { VerificationStatus } from '@prisma/client';

const TERMINAL: VerificationStatus[] = ['PASSED', 'FAILED', 'MANUAL_REVIEW'];

export function isTerminal(status: VerificationStatus): boolean {
  return TERMINAL.includes(status);
}

export type ProgressionDecision =
  | { action: 'wait' }
  | { action: 'progress_clean' }
  | { action: 'progress_flagged' };

/**
 * Decides what to do with an application in VERIFICATION given the current
 * statuses of its mandatory checks (Decision D8):
 *   - some check still pending/in-progress → wait
 *   - all terminal and all passed → progress to REVIEW cleanly
 *   - all terminal, at least one failed/manual_review → progress to REVIEW,
 *     flagged for the verifier
 *
 * `expectedCount` guards against progressing before every mandatory check has
 * even been created.
 */
export function decideProgression(
  statuses: VerificationStatus[],
  expectedCount: number,
): ProgressionDecision {
  if (statuses.length < expectedCount) {
    return { action: 'wait' };
  }
  if (!statuses.every(isTerminal)) {
    return { action: 'wait' };
  }
  const allPassed = statuses.every((s) => s === 'PASSED');
  return allPassed ? { action: 'progress_clean' } : { action: 'progress_flagged' };
}
