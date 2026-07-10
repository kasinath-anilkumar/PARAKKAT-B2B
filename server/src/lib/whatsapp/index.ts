import { env } from '../../config/env';
import { ConsoleWhatsApp } from './consoleWhatsApp';
import { MetaWhatsApp } from './metaWhatsApp';
import type { WhatsAppProvider } from './whatsapp.types';

export type { WhatsAppProvider } from './whatsapp.types';

let instance: WhatsAppProvider | undefined;

export function getWhatsApp(): WhatsAppProvider {
  if (!instance) {
    instance = env.WHATSAPP_PROVIDER === 'meta' ? new MetaWhatsApp() : new ConsoleWhatsApp();
  }
  return instance;
}
