import { useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, PageHeader, Select, Tabs, Toggle, type Tone } from '../../components/ui/kit';
import { AGENCY_NOTIFICATIONS, type AgencyNotification, type NotifType } from '../mock';

const TYPE_TONE: Record<NotifType, Tone> = {
  Booking: 'green',
  Cancellation: 'red',
  Payment: 'amber',
  Credit: 'violet',
  Promotion: 'sky',
  System: 'slate',
};
const PREF_TYPES: NotifType[] = ['Booking', 'Cancellation', 'Payment', 'Credit', 'Promotion', 'System'];

export function AgencyNotificationsPage() {
  const [tab, setTab] = useState('inbox');
  const [items, setItems] = useState<AgencyNotification[]>(AGENCY_NOTIFICATIONS);
  const [filter, setFilter] = useState('all');
  const [prefs, setPrefs] = useState<Record<NotifType, boolean>>({
    Booking: true,
    Cancellation: true,
    Payment: true,
    Credit: true,
    Promotion: false,
    System: true,
  });

  const shown = useMemo(() => items.filter((n) => filter === 'all' || n.type === filter), [items, filter]);
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((p) => p.map((n) => ({ ...n, read: true })));
  const toggleRead = (id: string) => setItems((p) => p.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));

  return (
    <AppShell>
      <PageHeader
        title="Notifications"
        subtitle="Booking, payment, credit and system alerts."
        actions={unread > 0 ? <Button variant="secondary" onClick={markAllRead}>Mark all read</Button> : undefined}
      />

      <Tabs
        tabs={[
          { key: 'inbox', label: 'Inbox', count: unread },
          { key: 'preferences', label: 'Preferences' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'inbox' && (
        <>
          <div className="mb-3">
            <Select
              value={filter}
              onChange={setFilter}
              options={[{ value: 'all', label: 'All types' }, ...PREF_TYPES.map((t) => ({ value: t, label: t }))]}
            />
          </div>
          <div className="space-y-2">
            {shown.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-xl border p-3 ${n.read ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/40'}`}
              >
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{n.title}</span>
                    <Badge tone={TYPE_TONE[n.type]}>{n.type}</Badge>
                    <span className="text-xs text-slate-400">{n.time}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>
                </div>
                <button onClick={() => toggleRead(n.id)} className="shrink-0 text-xs text-slate-400 hover:text-slate-700">
                  {n.read ? 'Mark unread' : 'Mark read'}
                </button>
              </div>
            ))}
            {shown.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">No notifications.</div>}
          </div>
        </>
      )}

      {tab === 'preferences' && (
        <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Notify me about</div>
          <div className="space-y-3">
            {PREF_TYPES.map((t) => (
              <div key={t} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge tone={TYPE_TONE[t]}>{t}</Badge>
                </div>
                <Toggle checked={prefs[t]} onChange={(v) => setPrefs((p) => ({ ...p, [t]: v }))} />
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
