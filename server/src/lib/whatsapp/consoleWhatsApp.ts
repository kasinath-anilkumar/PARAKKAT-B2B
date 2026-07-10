import { logger } from '../logger';
import type { WhatsAppProvider } from './whatsapp.types';

/** Dev fallback — logs instead of sending. */
export class ConsoleWhatsApp implements WhatsAppProvider {
  async send(to: string, message: string): Promise<void> {
    logger.info('[ConsoleWhatsApp] message not actually sent (dev fallback)', { to, message });
  }
}
