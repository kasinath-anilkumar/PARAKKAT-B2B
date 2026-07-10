import { logger } from '../logger';
import type { SmsProvider } from './sms.types';

export class ConsoleSms implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    logger.info('[ConsoleSms] SMS not actually sent (dev fallback)', { phone, code });
  }
}
