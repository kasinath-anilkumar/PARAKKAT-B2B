import type { ActorRole, ApplicationLifecycleState } from '@prisma/client';

export type LifecycleState = ApplicationLifecycleState;

/**
 * The agency lifecycle state machine (Instructions.md §7 / projectScope.md §4.4):
 *
 *   Draft → Verification → Review → Approved → Commercial Configuration → Active
 *                            └→ Rejected                     Active ↔ Suspended
 *
 * This is the single source of truth for which transitions are legal and who
 * may perform each. Phase 2 only exercises DRAFT → VERIFICATION; the rest of
 * the table is defined now so Phases 3/4 route through the same module without
 * reshaping it.
 */
export interface TransitionRule {
  from: LifecycleState;
  to: LifecycleState;
  /** Roles permitted to perform this transition. */
  allowedActors: ActorRole[];
}

export const TRANSITIONS: TransitionRule[] = [
  // Phase 2 — applicant submits their completed draft.
  { from: 'DRAFT', to: 'VERIFICATION', allowedActors: ['APPLICANT', 'ADMIN'] },

  // Phase 3 — Digio checks complete; auto-progression (D8) or manual push.
  { from: 'VERIFICATION', to: 'REVIEW', allowedActors: ['SYSTEM', 'ADMIN'] },

  // Phase 4 — verifier decision.
  { from: 'REVIEW', to: 'APPROVED', allowedActors: ['ADMIN', 'VERIFIER'] },
  { from: 'REVIEW', to: 'REJECTED', allowedActors: ['ADMIN', 'VERIFIER'] },
  // Phase 4 — verifier sends the application back for re-verification
  // (request re-submission of specific checks/documents).
  { from: 'REVIEW', to: 'VERIFICATION', allowedActors: ['ADMIN', 'VERIFIER'] },

  // Phase 4 — commercial config + agreement/eSign + activation.
  { from: 'APPROVED', to: 'COMMERCIAL_CONFIGURATION', allowedActors: ['ADMIN'] },
  { from: 'COMMERCIAL_CONFIGURATION', to: 'ACTIVE', allowedActors: ['SYSTEM', 'ADMIN'] },

  // Phase 4 — suspend / reactivate an active agency.
  { from: 'ACTIVE', to: 'SUSPENDED', allowedActors: ['ADMIN'] },
  { from: 'SUSPENDED', to: 'ACTIVE', allowedActors: ['ADMIN'] },
];

/** Terminal states have no outgoing transitions. */
export const TERMINAL_STATES: LifecycleState[] = ['REJECTED'];

export function findTransition(
  from: LifecycleState,
  to: LifecycleState,
): TransitionRule | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.to === to);
}

export function canTransition(from: LifecycleState, to: LifecycleState, actor: ActorRole): boolean {
  const rule = findTransition(from, to);
  return Boolean(rule && rule.allowedActors.includes(actor));
}

export function allowedNextStates(from: LifecycleState): LifecycleState[] {
  return TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
}

export type TransitionError =
  | { kind: 'invalid_transition'; from: LifecycleState; to: LifecycleState }
  | { kind: 'forbidden_actor'; from: LifecycleState; to: LifecycleState; actor: ActorRole };

/** Returns an error descriptor if the transition is illegal, otherwise null. */
export function validateTransition(
  from: LifecycleState,
  to: LifecycleState,
  actor: ActorRole,
): TransitionError | null {
  const rule = findTransition(from, to);
  if (!rule) {
    return { kind: 'invalid_transition', from, to };
  }
  if (!rule.allowedActors.includes(actor)) {
    return { kind: 'forbidden_actor', from, to, actor };
  }
  return null;
}
