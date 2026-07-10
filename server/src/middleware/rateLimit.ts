import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// Rate limiting only applies in production. In dev/test a single machine
// hammers the same endpoints from one IP (test suites, manual clicking) and
// would otherwise trip the limiter.
const skip = () => env.NODE_ENV !== 'production';

/** Stricter limit for auth endpoints (login, MFA verify, refresh) — baseline brute-force protection. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
  skip,
});

/** Light baseline limit applied globally. */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});

/**
 * Stricter limit for public onboarding entry points (§11) — abuse protection
 * for anonymous draft creation. Keyed per IP.
 */
export const onboardingCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many applications from this address, please try again later.' },
  skip,
});

/** Slightly looser limit for resume/update/submit actions on an existing draft. */
export const onboardingActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});

/**
 * Per-account abuse ceiling for authenticated sensitive actions (bookings,
 * settlement). Keyed by user id (falls back to IP) — must run AFTER
 * `authenticate` so req.user is populated (§11 — rate limiting per account).
 */
export const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
  message: { message: 'Too many requests on this account, please slow down.' },
  skip,
});
