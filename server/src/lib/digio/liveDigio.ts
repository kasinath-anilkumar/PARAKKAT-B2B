import { env } from '../../config/env';
import type {
  DigioClient,
  DigioESignInput,
  DigioESignResult,
  DigioInitiateInput,
  DigioInitiateResult,
} from './digio.types';

/**
 * Live Digio client skeleton. The real HTTP calls to Digio's KYB/eKYC APIs go
 * here — endpoint per check type, auth via DIGIO_CLIENT_ID/SECRET against
 * DIGIO_BASE_URL. Left unimplemented in this phase because sandbox
 * credentials/API contracts are not available; the mock drives the pipeline.
 * Wiring this up is a drop-in replacement — nothing else in the verification
 * module changes.
 */
export class LiveDigioClient implements DigioClient {
  async initiateCheck(_input: DigioInitiateInput): Promise<DigioInitiateResult> {
    void env;
    throw new Error(
      'LiveDigioClient.initiateCheck is not implemented — provide Digio API contracts and set DIGIO_PROVIDER=live once available',
    );
  }

  async initiateESign(_input: DigioESignInput): Promise<DigioESignResult> {
    throw new Error(
      'LiveDigioClient.initiateESign is not implemented — provide Digio eSign API contracts once available',
    );
  }
}
