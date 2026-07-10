export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface MailerProvider {
  send(options: SendMailOptions): Promise<void>;
}
