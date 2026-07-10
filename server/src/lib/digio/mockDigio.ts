import crypto from 'node:crypto';
import { logger } from '../logger';
import type {
  DigioClient,
  DigioESignInput,
  DigioESignResult,
  DigioInitiateInput,
  DigioInitiateResult,
} from './digio.types';

/**
 * Mock Digio client for dev/test. initiateCheck returns a provider reference
 * immediately (as the real API does) but performs no live call — results are
 * delivered afterward via the webhook endpoint (signed with
 * DIGIO_WEBHOOK_SECRET) or an admin manual override. This lets the entire
 * verification pipeline — records, idempotent webhooks, auto-progression — be
 * exercised end to end without Digio credentials.
 */
export class MockDigioClient implements DigioClient {
  async initiateCheck(input: DigioInitiateInput): Promise<DigioInitiateResult> {
    const providerRef = `mock-${input.checkType.toLowerCase()}-${crypto.randomUUID()}`;
    logger.info('[MockDigio] initiated check (no live call)', {
      applicationId: input.applicationId,
      checkType: input.checkType,
      providerRef,
    });
    return {
      providerRef,
      requestPayload: {
        checkType: input.checkType,
        // Only non-sensitive routing context is retained.
        hasGstin: Boolean(input.gstin),
        hasPan: Boolean(input.pan),
        hasBank: Boolean(input.bankAccount),
        initiatedBy: 'mock',
      },
    };
  }

  async initiateESign(input: DigioESignInput): Promise<DigioESignResult> {
    const providerRef = `mock-esign-${crypto.randomUUID()}`;
    logger.info('[MockDigio] initiated eSign (no live call)', {
      applicationId: input.applicationId,
      providerRef,
    });
    return {
      providerRef,
      // In dev this URL is informational only; the "signature" is delivered by
      // POSTing a signed webhook to /api/webhooks/digio for this providerRef.
      signingUrl: `https://mock-digio.local/esign/${providerRef}`,
    };
  }
}
