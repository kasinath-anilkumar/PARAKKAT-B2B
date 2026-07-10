/**
 * PII masking helpers (Instructions.md §11 / projectScope.md §6). Used when
 * surfacing application data to admins/verifiers — the applicant themselves
 * sees their own unmasked data when resuming a draft.
 */

/** Keeps the last `visible` characters, masks the rest. e.g. maskTail('1234567890', 4) → '******7890'. */
export function maskTail(value: string | null | undefined, visible = 4): string | null {
  if (!value) return value ?? null;
  if (value.length <= visible) return '*'.repeat(value.length);
  return '*'.repeat(value.length - visible) + value.slice(-visible);
}

/** Masks a PAN keeping only the last 4 (e.g. ABCDE1234F → ******234F). */
export function maskPan(pan: string | null | undefined): string | null {
  return maskTail(pan, 4);
}

/** Masks a bank account number keeping only the last 4. */
export function maskAccount(account: string | null | undefined): string | null {
  return maskTail(account, 4);
}

/** Masks an Aadhaar reference token keeping only the last 4. */
export function maskAadhaarRef(ref: string | null | undefined): string | null {
  return maskTail(ref, 4);
}
