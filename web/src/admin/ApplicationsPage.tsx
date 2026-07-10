import { AppShell } from '../components/layout/AppShell';
import { ApplicationsQueue } from './ApplicationsQueue';

export function ApplicationsPage() {
  return (
    <AppShell title="Applications">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <ApplicationsQueue />
      </div>
    </AppShell>
  );
}
