import type { ResumeSession } from '../types/onboarding';

// The resume token is scoped to a single pre-activation draft (no financial or
// account access), so persisting it in localStorage for resume convenience is
// an acceptable trade-off — unlike the auth access token, which stays in memory.
const KEY = 'onboarding_resume_session';

export function saveResumeSession(session: ResumeSession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function loadResumeSession(): ResumeSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ResumeSession;
  } catch {
    return null;
  }
}

export function clearResumeSession(): void {
  localStorage.removeItem(KEY);
}
