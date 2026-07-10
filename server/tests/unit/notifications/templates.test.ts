import { describe, expect, it } from 'vitest';
import {
  type NotificationPayload,
  renderNotification,
} from '../../../src/modules/notifications/templates';

const allEvents: NotificationPayload[] = [
  { event: 'REGISTRATION_RECEIVED', applicationId: 'app-1', legalName: 'Acme' },
  { event: 'VERIFICATION_STARTED', applicationId: 'app-1', legalName: 'Acme' },
  { event: 'APPLICATION_APPROVED', applicationId: 'app-1', legalName: 'Acme' },
  { event: 'APPLICATION_REJECTED', applicationId: 'app-1', reason: 'bad docs' },
  { event: 'RESUBMISSION_REQUESTED', applicationId: 'app-1', reason: 'blurry PAN' },
  { event: 'AGREEMENT_ESIGN_REQUEST', applicationId: 'app-1', signingUrl: 'https://sign/abc' },
  { event: 'AGENCY_ACTIVATED', loginUrl: 'https://app', temporaryPassword: 'secret-temp' },
  { event: 'AGENCY_SUSPENDED', legalName: 'Acme' },
  { event: 'AGENCY_REACTIVATED', legalName: 'Acme' },
];

describe('renderNotification', () => {
  it('produces a non-empty subject/html/text for every event', () => {
    for (const payload of allEvents) {
      const r = renderNotification(payload);
      expect(r.subject.length).toBeGreaterThan(0);
      expect(r.html.length).toBeGreaterThan(0);
      expect(r.text.length).toBeGreaterThan(0);
    }
  });

  it('includes the signing URL for the eSign request and provides an SMS body', () => {
    const r = renderNotification({
      event: 'AGREEMENT_ESIGN_REQUEST',
      applicationId: 'app-1',
      signingUrl: 'https://sign/xyz',
    });
    expect(r.html).toContain('https://sign/xyz');
    expect(r.sms).toContain('https://sign/xyz');
  });

  it('includes the reason for a rejection', () => {
    const r = renderNotification({ event: 'APPLICATION_REJECTED', applicationId: 'a', reason: 'mismatch' });
    expect(r.text).toContain('mismatch');
  });

  it('only marks time-sensitive events with an SMS body', () => {
    expect(renderNotification({ event: 'REGISTRATION_RECEIVED', applicationId: 'a', legalName: null }).sms).toBeUndefined();
    expect(renderNotification({ event: 'AGENCY_ACTIVATED', loginUrl: 'https://app' }).sms).toBeDefined();
  });
});
