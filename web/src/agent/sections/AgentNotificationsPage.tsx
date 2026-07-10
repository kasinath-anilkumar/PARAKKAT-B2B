import { useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, PageHeader, Select, type Tone } from '../../components/ui/kit';
import { AGENT_NOTIFICATIONS, type AgentNotification, type NotifType } from '../mock';

const TYPE_TONE: Record<NotifType, Tone> = {
  Booking: 'green',
  Cancellation: 'red',
  Modification: 'amber',
  System: 'slate',
  Agency: 'violet',
};
const TYPES: NotifType[] = ['Booking', 'Cancellation', 'Modification', 'System', 'Agency'];

export function AgentNotificationsPage() {
  const [items, setItems] = useState<AgentNotification[]>(AGENT_NOTIFICATIONS);
  const [filter, setFilter] = useState('all');

  const shown = useMemo(() => items.filter((n) => filter === 'all' || n.type === filter), [items, filter]);
  const unread = items.filter((n) => !n.read).length;

  return (
    <AppShell>
      <PageHeader
        title="Notifications"
        subtitle="Booking, modification, cancellation and agency announcements."
        actions={unread > 0 ? <Button variant="secondary" onClick={() => setItems((p) => p.map((n) => ({ ...n, read: true })))}>Mark all read</Button> : undefined}
      />

      <div className="mb-3">
        <Select
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all', label: `All (${unread} unread)` }, ...TYPES.map((t) => ({ value: t, label: t }))]}
        />
      </div>

      <div className="space-y-2">
        {shown.map((n) => (
          <div key={n.id} className={`flex items-start gap-3 rounded-xl border p-3 ${n.read ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/40'}`}>
            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-800">{n.title}</span>
                <Badge tone={TYPE_TONE[n.type]}>{n.type}</Badge>
                <span className="text-xs text-slate-400">{n.time}</span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>
            </div>
            <button onClick={() => setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: !x.read } : x)))} className="shrink-0 text-xs text-slate-400 hover:text-slate-700">
              {n.read ? 'Mark unread' : 'Mark read'}
            </button>
          </div>
        ))}
        {shown.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">No notifications.</div>}
      </div>
    </AppShell>
  );
}
