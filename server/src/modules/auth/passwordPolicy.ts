import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';

/**
 * v3 §10.2 — explicit password policy. A password must meet the configured
 * minimum length and contain at least one upper-case letter, one lower-case
 * letter, one digit, and one symbol. Enforced everywhere a user-chosen password
 * is set (agent creation, self-service change); server-generated temporary
 * passwords are produced to satisfy the same rules.
 */
const UPPER = /[A-Z]/;
const LOWER = /[a-z]/;
const DIGIT = /\d/;
const SYMBOL = /[^A-Za-z0-9]/;

/** Returns a list of human-readable policy violations (empty = compliant). */
export function validatePassword(pw: string): string[] {
  const failures: string[] = [];
  if (pw.length < env.PASSWORD_MIN_LENGTH) failures.push(`be at least ${env.PASSWORD_MIN_LENGTH} characters`);
  if (!UPPER.test(pw)) failures.push('include an upper-case letter');
  if (!LOWER.test(pw)) failures.push('include a lower-case letter');
  if (!DIGIT.test(pw)) failures.push('include a digit');
  if (!SYMBOL.test(pw)) failures.push('include a symbol');
  return failures;
}

/** Throws a 400 with a combined message if the password is non-compliant. */
export function assertStrongPassword(pw: string): void {
  const failures = validatePassword(pw);
  if (failures.length) throw ApiError.badRequest(`Password must ${failures.join(', ')}.`);
}

/** Zod schema enforcing the policy — usable in request validation. */
export const strongPasswordSchema = z
  .string()
  .max(200)
  .superRefine((pw, ctx) => {
    for (const failure of validatePassword(pw)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Password must ${failure}.` });
    }
  });

/**
 * Generates a policy-compliant random password (used for temporary credentials).
 * Guarantees one character from each required class, then fills with a mixed
 * alphabet and shuffles.
 */
export function generateStrongPassword(length = 16): string {
  const len = Math.max(length, env.PASSWORD_MIN_LENGTH, 12);
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*-_=+';
  const all = uppers + lowers + digits + symbols;
  const pick = (set: string) => set[crypto.randomInt(set.length)];

  const chars = [pick(uppers), pick(lowers), pick(digits), pick(symbols)];
  while (chars.length < len) chars.push(pick(all));

  // Fisher–Yates shuffle with a CSPRNG so the guaranteed chars aren't positional.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
