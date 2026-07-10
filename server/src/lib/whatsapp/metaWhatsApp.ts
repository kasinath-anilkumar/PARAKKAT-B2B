import { env } from '../../config/env';
import { logger } from '../logger';
import type { WhatsAppProvider } from './whatsapp.types';

/**
 * Stub for the Meta WhatsApp Business Cloud API. Real delivery requires a
 * BSP/Meta app, a phone-number id, and approved message templates (a scheduling
 * dependency per v3 §9). Until wired, it logs like the console provider so
 * enabling it never breaks the notification flow.
 */
export class MetaWhatsApp implements WhatsAppProvider {
  async send(to: string, message: string): Promise<void> {
    if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
      logger.warn('[MetaWhatsApp] credentials missing — message not sent', { to });
      return;
    }
    // TODO: POST https://graph.facebook.com/v20.0/{phoneNumberId}/messages with an approved template.
    logger.info('[MetaWhatsApp] send (stub)', { to, message });
  }
}
