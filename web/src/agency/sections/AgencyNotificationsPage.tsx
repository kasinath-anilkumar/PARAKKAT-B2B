import { AppShell } from '../../components/layout/AppShell';
import { PageHeader } from '../../components/ui/kit';
import { NotificationInbox } from '../../shared/NotificationInbox';

export function AgencyNotificationsPage() {
  return (
    <AppShell>
      <PageHeader title="Notifications" subtitle="Alerts about your bookings, invoices, payments, credit and account." />
      <NotificationInbox />
    </AppShell>
  );
}
