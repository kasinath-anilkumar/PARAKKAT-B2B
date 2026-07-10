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
  | { event: 'AGENCY_REACTIVATED'; legalName: string | null };

export type NotificationEvent = NotificationPayload['event'];

export interface RenderedNotification {
  subject: string;
  html: string;
  text: string;
  /** Present only for time-sensitive events; sent when SMS notifications are enabled. */
  sms?: string;
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
  }
}
