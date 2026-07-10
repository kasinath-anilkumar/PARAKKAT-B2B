/**
 * Event-driven notification templates (Instructions.md §5 / projectScope.md
 * §4.14). Each event is a discriminated-union payload; renderNotification is a
 * pure function producing the email subject/html/text and an optional SMS body
 * for time-sensitive events. Keeping this pure makes every template unit
 * testable without a mailer.
 */

export type NotificationPayload =
  | { event: 'REGISTRATION_RECEIVED'; applicationId: string; legalName: string | null }
  | { event: 'VERIFICATION_STARTED'; applicationId: string; legalName: string | null }
  | { event: 'APPLICATION_APPROVED'; applicationId: string; legalName: string | null }
  | { event: 'APPLICATION_REJECTED'; applicationId: string; reason: string }
  | { event: 'RESUBMISSION_REQUESTED'; applicationId: string; reason: string }
  | { event: 'AGREEMENT_ESIGN_REQUEST'; applicationId: string; signingUrl: string }
  | { event: 'AGENCY_ACTIVATED'; loginUrl: string; temporaryPassword?: string }
  | { event: 'AGENCY_SUSPENDED'; legalName: string | null }
  | { event: 'AGENCY_REACTIVATED'; legalName: string | null }
  | { event: 'INVOICE_OVERDUE'; number: string; amount: number; daysOverdue: number }
  | { event: 'INVOICE_DUE_REMINDER'; number: string; amount: number; dueDate: string }
  | { event: 'CREDIT_UTILIZATION_ALERT'; utilizationPct: number; creditLimit: number }
  | { event: 'BOOKING_CONFIRMED'; resortName: string; rooms: number; checkIn: string }
  | { event: 'BOOKING_CANCELLED'; resortName: string; reason?: string }
  | { event: 'BOOKING_PENDING_CONFIRMATION'; resortName: string }
  | { event: 'BOOKING_CONFIRMATION_FAILED'; resortName: string }
  | { event: 'NO_SHOW_RECORDED'; resortName: string; checkIn: string }
  | { event: 'PAYMENT_RECEIVED'; number: string; amount: number }
  | { event: 'PAYMENT_CHARGEBACK'; number: string; amount: number; reason: string };

export type NotificationEvent = NotificationPayload['event'];

export interface RenderedNotification {
  subject: string;
  html: string;
  text: string;
  /** Present only for time-sensitive events; sent when SMS notifications are enabled. */
  sms?: string;
  /** WhatsApp body (v3 §9); falls back to `sms` when omitted. */
  whatsapp?: string;
}

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function wrap(title: string, body: string): { html: string; text: string } {
  return {
    html: `<div><h2>${title}</h2><p>${body}</p></div>`,
    text: `${title}\n\n${body.replace(/<[^>]+>/g, '')}`,
  };
}

export function renderNotification(payload: NotificationPayload): RenderedNotification {
  switch (payload.event) {
    case 'REGISTRATION_RECEIVED': {
      const subject = 'We received your application';
      const body = `Thanks for registering${payload.legalName ? `, ${payload.legalName}` : ''}. Your application reference is ${payload.applicationId}. We'll begin verification and keep you updated.`;
      return { subject, ...wrap(subject, body) };
    }
    case 'VERIFICATION_STARTED': {
      const subject = 'Your verification is in progress';
      const body = `We've started the identity and business verification for application ${payload.applicationId}. No action is needed unless we ask for a re-submission.`;
      return { subject, ...wrap(subject, body) };
    }
    case 'APPLICATION_APPROVED': {
      const subject = 'Your application has been approved';
      const body = `Good news — your application has been approved. Commercial terms and an agreement to sign will follow shortly.`;
      return { subject, ...wrap(subject, body) };
    }
    case 'APPLICATION_REJECTED': {
      const subject = 'Update on your application';
      const body = `Unfortunately your application was not approved. Reason: ${payload.reason}. You may re-apply per our policy.`;
      return { subject, ...wrap(subject, body) };
    }
    case 'RESUBMISSION_REQUESTED': {
      const subject = 'Additional information needed';
      const body = `We need some items re-submitted before we can proceed. ${payload.reason} Please use your resume link to update your application.`;
      return { subject, ...wrap(subject, body) };
    }
    case 'AGREEMENT_ESIGN_REQUEST': {
      const subject = 'Please sign your partnership agreement';
      const body = `Your partnership agreement is ready. Please sign it here: <a href="${payload.signingUrl}">${payload.signingUrl}</a>`;
      return {
        subject,
        ...wrap(subject, body),
        sms: `Please sign your partnership agreement: ${payload.signingUrl}`,
      };
    }
    case 'AGENCY_ACTIVATED': {
      const subject = 'Your agency account is active';
      const cred = payload.temporaryPassword
        ? ` Sign in at ${payload.loginUrl} with a temporary password: ${payload.temporaryPassword}. Please change it after your first login.`
        : ` Sign in at ${payload.loginUrl}.`;
      const body = `Welcome! Your agency is now active.${cred}`;
      return {
        subject,
        ...wrap(subject, body),
        sms: `Your agency is active. Sign in at ${payload.loginUrl}.`,
      };
    }
    case 'AGENCY_SUSPENDED': {
      const subject = 'Your agency has been suspended';
      const body = `Your agency${payload.legalName ? ` ${payload.legalName}` : ''} has been suspended and cannot transact until reactivated. Existing balances remain due.`;
      return { subject, ...wrap(subject, body) };
    }
    case 'AGENCY_REACTIVATED': {
      const subject = 'Your agency has been reactivated';
      const body = `Your agency${payload.legalName ? ` ${payload.legalName}` : ''} is active again and can transact.`;
      return { subject, ...wrap(subject, body) };
    }
    case 'INVOICE_DUE_REMINDER': {
      const subject = `Payment reminder — invoice ${payload.number}`;
      const body = `Invoice ${payload.number} for ${inr(payload.amount)} is due on ${payload.dueDate.slice(0, 10)}. Please settle it on time to keep your credit available.`;
      const short = `Reminder: invoice ${payload.number} (${inr(payload.amount)}) is due ${payload.dueDate.slice(0, 10)}.`;
      return { subject, ...wrap(subject, body), sms: short, whatsapp: short };
    }
    case 'INVOICE_OVERDUE': {
      const subject = `Overdue invoice ${payload.number}`;
      const body = `Invoice ${payload.number} for ${inr(payload.amount)} is ${payload.daysOverdue} day(s) overdue. Please settle it to avoid suspension of booking rights.`;
      const short = `Overdue: invoice ${payload.number} (${inr(payload.amount)}) is ${payload.daysOverdue}d late. Please pay to avoid suspension.`;
      return { subject, ...wrap(subject, body), sms: short, whatsapp: short };
    }
    case 'CREDIT_UTILIZATION_ALERT': {
      const subject = 'Credit utilisation alert';
      const body = `You have used ${payload.utilizationPct}% of your ${inr(payload.creditLimit)} credit limit. Settle outstanding invoices to free up credit for new bookings.`;
      const short = `Credit alert: ${payload.utilizationPct}% of your ${inr(payload.creditLimit)} limit used.`;
      return { subject, ...wrap(subject, body), sms: short, whatsapp: short };
    }
    case 'BOOKING_CONFIRMED': {
      const subject = `Booking confirmed — ${payload.resortName}`;
      const body = `Your booking of ${payload.rooms} room(s) at ${payload.resortName} (check-in ${payload.checkIn.slice(0, 10)}) is confirmed.`;
      const short = `Confirmed: ${payload.rooms} room(s) at ${payload.resortName}, check-in ${payload.checkIn.slice(0, 10)}.`;
      return { subject, ...wrap(subject, body), sms: short, whatsapp: short };
    }
    case 'BOOKING_CANCELLED': {
      const subject = `Booking cancelled — ${payload.resortName}`;
      const body = `Your booking at ${payload.resortName} has been cancelled.${payload.reason ? ` Reason: ${payload.reason}.` : ''} Any applicable refund/credit note has been processed.`;
      const short = `Cancelled: ${payload.resortName}.${payload.reason ? ` ${payload.reason}.` : ''}`;
      return { subject, ...wrap(subject, body), sms: short, whatsapp: short };
    }
    case 'BOOKING_PENDING_CONFIRMATION': {
      const subject = `Booking received — confirming with ${payload.resortName}`;
      const body = `We've received your booking for ${payload.resortName} and any payment is secured. We're completing the final confirmation with the resort's system and will confirm shortly — no action is needed.`;
      const short = `Booking for ${payload.resortName} received — final confirmation in progress.`;
      return { subject, ...wrap(subject, body), sms: short, whatsapp: short };
    }
    case 'BOOKING_CONFIRMATION_FAILED': {
      const subject = `Action needed — booking at ${payload.resortName}`;
      const body = `We were unable to confirm your booking at ${payload.resortName} with the resort's system after several attempts. Our team is resolving this and any amount paid will be refunded or re-booked. We'll be in touch shortly.`;
      const short = `Couldn't confirm ${payload.resortName}. Our team is resolving it; any payment will be refunded/re-booked.`;
      return { subject, ...wrap(subject, body), sms: short, whatsapp: short };
    }
    case 'NO_SHOW_RECORDED': {
      const subject = `No-show recorded — ${payload.resortName}`;
      const body = `A no-show was recorded for your booking at ${payload.resortName} (check-in ${payload.checkIn.slice(0, 10)}). A charge has been applied per the cancellation policy.`;
      return { subject, ...wrap(subject, body) };
    }
    case 'PAYMENT_RECEIVED': {
      const subject = `Payment received — invoice ${payload.number}`;
      const body = `We've received your payment of ${inr(payload.amount)} against invoice ${payload.number}. Thank you.`;
      const short = `Payment of ${inr(payload.amount)} received for invoice ${payload.number}.`;
      return { subject, ...wrap(subject, body), sms: short, whatsapp: short };
    }
    case 'PAYMENT_CHARGEBACK': {
      const subject = `Payment reversed — ${payload.number}`;
      const body = `A payment of ${inr(payload.amount)} against ${payload.number} has been reversed (chargeback). Reason: ${payload.reason}. This amount is now outstanding again — please contact us to resolve it.`;
      const short = `Chargeback: ${inr(payload.amount)} on ${payload.number} reversed. Now outstanding.`;
      return { subject, ...wrap(subject, body), sms: short, whatsapp: short };
    }
  }
}
