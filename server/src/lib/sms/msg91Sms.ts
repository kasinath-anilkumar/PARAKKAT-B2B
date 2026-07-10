import { env } from '../../config/env';
import { logger } from '../logger';
import type { SmsProvider } from './sms.types';

/**
 * Stub adapter — interface-complete but not wired to a live MSG91 account in
 * Phase 1 (SMS/OTP delivery is not required for Phase 1's MFA, which uses
 * TOTP or email). Logs and no-ops instead of throwing so callers don't need
 * special-casing; replace the body with a real MSG91 API call when needed.
 */
export class Msg91Sms implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    if (!env.MSG91_AUTH_KEY) {
      logger.warn('[Msg91Sms] MSG91_AUTH_KEY not configured; SMS not sent', { phone });
      return;
    }
    logger.warn('[Msg91Sms] MSG91 integration not implemented in Phase 1; SMS not sent', {
      phone,
      code,
    });
  }
}
