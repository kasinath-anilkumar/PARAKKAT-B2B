import { AppShell } from '../../components/layout/AppShell';
import { PageHeader } from '../../components/ui/kit';
import { NotificationInbox } from '../../shared/NotificationInbox';

export function AgentNotificationsPage() {
  return (
    <AppShell>
      <PageHeader title="Notifications" subtitle="Alerts about your bookings and account." />
      <NotificationInbox />
    </AppShell>
  );
}
