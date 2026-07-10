import { env } from '../../config/env';
import { LiveDigioClient } from './liveDigio';
import { MockDigioClient } from './mockDigio';
import type { DigioClient } from './digio.types';

export type {
  DigioClient,
  DigioInitiateInput,
  DigioInitiateResult,
  DigioESignInput,
  DigioESignResult,
  DigioResultStatus,
  DigioWebhookPayload,
} from './digio.types';
export { MANDATORY_CHECKS } from './digio.types';
export { signDigioBody, verifyDigioSignature } from './signature';

let instance: DigioClient | undefined;

export function getDigio(): DigioClient {
  if (!instance) {
    instance = env.DIGIO_PROVIDER === 'live' ? new LiveDigioClient() : new MockDigioClient();
  }
  return instance;
}
