import { env } from '../../config/env';
import { getMailer } from '../../lib/mailer';
import { getSms } from '../../lib/sms';
import { getWhatsApp } from '../../lib/whatsapp';
import { logger } from '../../lib/logger';
import { maskTail } from '../../utils/mask';
import { recordAuditLogSafe } from '../audit/audit.service';
import { type NotificationPayload, renderNotification } from './templates';

export interface Recipient {
  email?: string | null;
  phone?: string | null;
}

export interface EntityRef {
  entityType: string;
  entityId: string;
}

export interface NotificationJob {
  payload: NotificationPayload;
  recipient: Recipient;
  ref: EntityRef;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return maskTail(email, 2) ?? email;
  return `${maskTail(local, 1) ?? ''}@${domain}`;
}

/**
 * Actually delivers a notification: renders the template, sends email and
 * (when enabled + time-sensitive) SMS, and audit-logs the send. Never throws —
 * a delivery failure must not break the business flow that triggered it. The
 * audit record intentionally omits the message body so sensitive content
 * (e.g. a temporary password) is never persisted to the log.
 */
export async function deliverNotification(job: NotificationJob): Promise<void> {
  const rendered = renderNotification(job.payload);
  const channels: string[] = [];

  if (job.recipient.email) {
    try {
      await getMailer().send({
        to: job.recipient.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      channels.push('email');
    } catch (err) {
      logger.error('Notification email failed', {
        event: job.payload.event,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (env.SMS_NOTIFICATIONS_ENABLED && rendered.sms && job.recipient.phone) {
    try {
      await getSms().sendOtp(job.recipient.phone, rendered.sms);
      channels.push('sms');
    } catch (err) {
      logger.error('Notification SMS failed', {
        event: job.payload.event,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const whatsappBody = rendered.whatsapp ?? rendered.sms;
  if (env.WHATSAPP_NOTIFICATIONS_ENABLED && whatsappBody && job.recipient.phone) {
    try {
      await getWhatsApp().send(job.recipient.phone, whatsappBody);
      channels.push('whatsapp');
    } catch (err) {
      logger.error('Notification WhatsApp failed', {
        event: job.payload.event,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await recordAuditLogSafe({
    entityType: job.ref.entityType,
    entityId: job.ref.entityId,
    event: 'NOTIFICATION_SENT',
    actorId: null,
    actorRole: 'SYSTEM',
    after: {
      notification: job.payload.event,
      channels,
      to: job.recipient.email ? maskEmail(job.recipient.email) : null,
    },
  });
}

/**
 * Public entry point for emitting a notification. Delivers synchronously and
 * never throws into the caller's flow. (Async/queued delivery is a future
 * enhancement — it would reintroduce a Redis-backed worker.)
 */
export async function notify(
  payload: NotificationPayload,
  recipient: Recipient,
  ref: EntityRef,
): Promise<void> {
  if (!recipient.email && !recipient.phone) {
    logger.warn('Notification skipped: no recipient', { event: payload.event });
    return;
  }
  await deliverNotification({ payload, recipient, ref });
}
