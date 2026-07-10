import { logger } from '../logger';
import type { MailerProvider, SendMailOptions } from './mailer.types';

export class ConsoleMailer implements MailerProvider {
  async send(options: SendMailOptions): Promise<void> {
    logger.info('[ConsoleMailer] email not actually sent (dev fallback)', {
      to: options.to,
      subject: options.subject,
      text: options.text ?? options.html,
    });
  }
}
