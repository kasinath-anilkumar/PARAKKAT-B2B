import type { NotificationAudience } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
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
  await persistNotification(payload, ref);
}

/** Resolves which inbox a notification belongs to from its entity ref. */
async function resolveTarget(ref: EntityRef): Promise<{ audience: NotificationAudience; agencyId: string | null } | null> {
  switch (ref.entityType) {
    case 'Agency':
      return { audience: 'AGENCY', agencyId: ref.entityId };
    case 'Invoice': {
      const inv = await prisma.invoice.findUnique({ where: { id: ref.entityId }, select: { agencyId: true } });
      return inv ? { audience: 'AGENCY', agencyId: inv.agencyId } : null;
    }
    case 'Booking': {
      const b = await prisma.booking.findUnique({ where: { id: ref.entityId }, select: { agencyId: true } });
      return b ? { audience: 'AGENCY', agencyId: b.agencyId } : null;
    }
    case 'Payment': {
      const p = await prisma.payment.findUnique({ where: { id: ref.entityId }, select: { agencyId: true } });
      return p ? { audience: 'AGENCY', agencyId: p.agencyId } : null;
    }
    case 'AgencyApplication':
    case 'Application':
      // Onboarding/pipeline events surface to portal admins.
      return { audience: 'ADMIN', agencyId: null };
    default:
      return null;
  }
}

/** Records the notification into the in-app inbox. Never throws into the caller. */
async function persistNotification(payload: NotificationPayload, ref: EntityRef): Promise<void> {
  try {
    const target = await resolveTarget(ref);
    if (!target) return;
    const rendered = renderNotification(payload);
    await prisma.notification.create({
      data: {
        audience: target.audience,
        agencyId: target.agencyId,
        event: payload.event,
        title: rendered.subject,
        body: rendered.text.slice(0, 1000),
        entityType: ref.entityType,
        entityId: ref.entityId,
      },
    });
  } catch (err) {
    logger.error('Persisting notification to inbox failed', {
      event: payload.event,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export interface NotificationActor {
  role: 'ADMIN' | 'VERIFIER' | 'AGENCY' | 'AGENT';
  agencyId: string | null;
}

function inboxWhere(actor: NotificationActor) {
  return actor.role === 'ADMIN' || actor.role === 'VERIFIER'
    ? { audience: 'ADMIN' as NotificationAudience }
    : { audience: 'AGENCY' as NotificationAudience, agencyId: actor.agencyId ?? '__none__' };
}

export async function listNotifications(actor: NotificationActor) {
  const items = await prisma.notification.findMany({
    where: inboxWhere(actor),
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const unread = items.filter((n) => !n.read).length;
  return { items, unread };
}

export async function unreadCount(actor: NotificationActor): Promise<number> {
  return prisma.notification.count({ where: { ...inboxWhere(actor), read: false } });
}

export async function markRead(id: string, actor: NotificationActor): Promise<void> {
  await prisma.notification.updateMany({ where: { id, ...inboxWhere(actor) }, data: { read: true } });
}

export async function markAllRead(actor: NotificationActor): Promise<void> {
  await prisma.notification.updateMany({ where: { ...inboxWhere(actor), read: false }, data: { read: true } });
}

/** Admin broadcast — drops an in-app notification into the inbox of active agencies. */
export async function broadcastToAgencies(input: { subject: string; body: string; agencyIds?: string[] }): Promise<{ sent: number }> {
  const agencies = input.agencyIds?.length
    ? await prisma.agency.findMany({ where: { id: { in: input.agencyIds } }, select: { id: true } })
    : await prisma.agency.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
  if (agencies.length === 0) return { sent: 0 };
  await prisma.notification.createMany({
    data: agencies.map((a) => ({
      audience: 'AGENCY' as NotificationAudience,
      agencyId: a.id,
      event: 'ADMIN_BROADCAST',
      title: input.subject,
      body: input.body,
    })),
  });
  return { sent: agencies.length };
}
