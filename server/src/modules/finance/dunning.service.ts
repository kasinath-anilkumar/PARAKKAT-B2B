import type { ActorRole } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { recordAuditLogSafe } from '../audit/audit.service';
import { notify } from '../notifications/notification.service';
import { suspendAgency } from '../agencies/agencies.service';
import { getOutstanding } from './finance.service';

/**
 * v3 §6.3 — overdue / dunning workflow. Enforces credit terms: notifies agencies
 * with overdue credit invoices, auto-suspends those past the configured
 * threshold, and raises credit-utilisation alerts. Designed to be run on a
 * schedule (operator cron) as well as on-demand by an admin. All thresholds are
 * env-configurable.
 */

interface Actor {
  actorId: string;
  actorRole: ActorRole;
}

export interface DunningSummary {
  overdueInvoices: number;
  remindersSent: number;
  agenciesSuspended: number;
  creditAlerts: number;
}

export async function runDunning(actor: Actor): Promise<DunningSummary> {
  const now = new Date();

  // 1. Overdue credit invoices → notify, and collect agencies past the suspend threshold.
  const overdue = await prisma.invoice.findMany({
    where: { status: 'ISSUED', paymentMode: 'CREDIT', dueDate: { lt: now } },
    include: { agency: { select: { id: true, contactEmail: true, contactPhone: true, status: true } } },
  });

  let remindersSent = 0;
  const toSuspend = new Set<string>();
  for (const inv of overdue) {
    const daysOverdue = inv.dueDate ? Math.floor((now.getTime() - inv.dueDate.getTime()) / 86_400_000) : 0;
    await notify(
      { event: 'INVOICE_OVERDUE', number: inv.number, amount: Number(inv.amount), daysOverdue },
      { email: inv.agency.contactEmail, phone: inv.agency.contactPhone },
      { entityType: 'Invoice', entityId: inv.id },
    );
    remindersSent++;
    if (daysOverdue >= env.DUNNING_SUSPEND_DAYS && inv.agency.status === 'ACTIVE') {
      toSuspend.add(inv.agency.id);
    }
  }

  // 2. Auto-suspension (idempotent — suspendAgency flips ACTIVE → SUSPENDED).
  let agenciesSuspended = 0;
  for (const agencyId of toSuspend) {
    try {
      await suspendAgency(agencyId, actor);
      agenciesSuspended++;
    } catch {
      // already suspended / not found — ignore
    }
  }

  // 3. Credit-utilisation alerts (≥ configured %).
  const configs = await prisma.commercialConfiguration.findMany({
    where: { isCurrent: true, paymentMode: 'CREDIT' },
    include: { agency: { select: { id: true, contactEmail: true, contactPhone: true, status: true } } },
  });
  let creditAlerts = 0;
  const alertRatio = env.CREDIT_UTILIZATION_ALERT_PCT / 100;
  for (const cfg of configs) {
    if (cfg.agency.status !== 'ACTIVE') continue;
    const limit = Number(cfg.creditLimit);
    if (limit <= 0) continue;
    const outstanding = await getOutstanding(cfg.agencyId);
    if (outstanding / limit >= alertRatio) {
      await notify(
        { event: 'CREDIT_UTILIZATION_ALERT', utilizationPct: Math.round((outstanding / limit) * 100), creditLimit: limit },
        { email: cfg.agency.contactEmail, phone: cfg.agency.contactPhone },
        { entityType: 'Agency', entityId: cfg.agencyId },
      );
      creditAlerts++;
    }
  }

  await recordAuditLogSafe({
    entityType: 'System',
    entityId: 'dunning',
    event: 'DUNNING_RUN',
    actorId: actor.actorId,
    actorRole: actor.actorRole,
    after: { overdueInvoices: overdue.length, remindersSent, agenciesSuspended, creditAlerts },
  });
  return { overdueInvoices: overdue.length, remindersSent, agenciesSuspended, creditAlerts };
}
