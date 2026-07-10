import { env } from '../../config/env';
import { ConsoleMailer } from './consoleMailer';
import { ResendMailer } from './resendMailer';
import type { MailerProvider } from './mailer.types';

export type { MailerProvider, SendMailOptions } from './mailer.types';

let instance: MailerProvider | undefined;

export function getMailer(): MailerProvider {
  if (!instance) {
    instance = env.MAILER_PROVIDER === 'resend' ? new ResendMailer() : new ConsoleMailer();
  }
  return instance;
}
