import { Resend } from 'resend';
import { env } from '../../config/env';
import type { MailerProvider, SendMailOptions } from './mailer.types';

export class ResendMailer implements MailerProvider {
  private client: Resend;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required when MAILER_PROVIDER=resend');
    }
    this.client = new Resend(env.RESEND_API_KEY);
  }

  async send(options: SendMailOptions): Promise<void> {
    const { error } = await this.client.emails.send({
      from: env.MAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    if (error) {
      throw new Error(`Resend send failed: ${error.message}`);
    }
  }
}
