import { describe, expect, it, vi } from 'vitest';
import { ConsoleMailer } from '../../../src/lib/mailer/consoleMailer';
import { logger } from '../../../src/lib/logger';

describe('ConsoleMailer', () => {
  it('logs the email instead of sending it', async () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => logger);
    const mailer = new ConsoleMailer();

    await mailer.send({ to: 'agent@example.com', subject: 'Test', html: '<p>hi</p>', text: 'hi' });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('not actually sent'),
      expect.objectContaining({ to: 'agent@example.com', subject: 'Test' }),
    );
    spy.mockRestore();
  });
});

describe('ResendMailer', () => {
  it('throws a clear error when RESEND_API_KEY is missing', async () => {
    const { ResendMailer } = await import('../../../src/lib/mailer/resendMailer');
    expect(() => new ResendMailer()).toThrow(/RESEND_API_KEY/);
  });
});
