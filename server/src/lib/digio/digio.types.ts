import type { VerificationCheckType } from '@prisma/client';

/** The KYB/eKYC checks the portal orchestrates through Digio (Instructions.md §6). */
export const MANDATORY_CHECKS: VerificationCheckType[] = [
  'GST',
  'PAN',
  'AADHAAR_EKYC',
  'BANK',
  'DOCUMENT',
];

/** Minimal application data an initiation call needs. */
export interface DigioInitiateInput {
  applicationId: string;
  checkType: VerificationCheckType;
  gstin?: string | null;
  pan?: string | null;
  repAadhaarRef?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
  legalName?: string | null;
}

export interface DigioInitiateResult {
  providerRef: string;
  // Stored on the Verification row for audit (sensitive fields already masked
  // upstream; this is the outbound request context, not raw PII).
  requestPayload: Record<string, unknown>;
}

/** Async result Digio pushes back via webhook. */
export type DigioResultStatus = 'passed' | 'failed' | 'manual_review';

export interface DigioWebhookPayload {
  providerRef: string;
  checkType?: VerificationCheckType;
  status: DigioResultStatus;
  data?: Record<string, unknown>;
}

export interface DigioESignInput {
  applicationId: string;
  documentStorageKey: string;
  signerName?: string | null;
  signerEmail?: string | null;
  signerAadhaarRef?: string | null;
}

export interface DigioESignResult {
  providerRef: string;
  // URL the authorized representative visits to complete the Aadhaar eSign.
  signingUrl: string;
}

export interface DigioClient {
  initiateCheck(input: DigioInitiateInput): Promise<DigioInitiateResult>;
  initiateESign(input: DigioESignInput): Promise<DigioESignResult>;
}
