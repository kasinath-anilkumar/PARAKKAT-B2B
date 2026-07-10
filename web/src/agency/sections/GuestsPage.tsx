import { useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Modal, PageHeader, SearchInput, Stat, Tabs, Toolbar, type Column } from '../../components/ui/kit';
import { AGENCY_BOOKINGS, GUESTS, type Guest } from '../mock';

export function GuestsPage() {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Guest | null>(null);

  const rows = useMemo(
    () =>
      GUESTS.filter(
        (g) => (tab === 'all' || (tab === 'frequent' && g.frequent)) && [g.name, g.email, g.phone].some((f) => f.toLowerCase().includes(q.toLowerCase())),
      ),
    [tab, q],
  );

  const columns: Column<Guest>[] = [
    {
      header: 'Guest',
      render: (g) => (
        <div>
          <div className="font-medium text-slate-800">{g.name}</div>
          <div className="text-xs text-slate-400">{g.email}</div>
        </div>
      ),
    },
    { header: 'Phone', render: (g) => <span className="text-slate-500">{g.phone}</span> },
    { header: 'Stays', align: 'right', render: (g) => g.stays },
    { header: 'Last stay', render: (g) => g.lastStay },
    { header: 'Tag', render: (g) => (g.frequent ? <Badge tone="violet">Frequent</Badge> : <span className="text-slate-300">—</span>) },
    { header: 'Actions', align: 'right', render: (g) => <Button variant="ghost" onClick={() => setSelected(g)}>View history</Button> },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Guest Management"
        subtitle="Guest profiles, stay history and saved traveller details."
        actions={<Button variant="primary">+ Add Guest</Button>}
      />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Guests" value={GUESTS.length} tone="blue" />
        <Stat label="Frequent" value={GUESTS.filter((g) => g.frequent).length} tone="violet" />
        <Stat label="Total Stays" value={GUESTS.reduce((s, g) => s + g.stays, 0)} tone="green" />
        <Stat label="Repeat rate" value="63%" tone="sky" />
      </div>

      <Tabs
        tabs={[
          { key: 'all', label: 'All Guests', count: GUESTS.length },
          { key: 'frequent', label: 'Frequent', count: GUESTS.filter((g) => g.frequent).length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search guests…" />
      </Toolbar>

      <DataTable columns={columns} rows={rows} rowKey={(g) => g.id} empty="No guests found." />

      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)} wide>
          <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
            <Detail label="Phone" value={selected.phone} />
            <Detail label="Email" value={selected.email} />
            <Detail label="Total stays" value={selected.stays} />
            <Detail label="Last stay" value={selected.lastStay} />
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Stay history</div>
            <div className="space-y-1.5 text-sm text-slate-600">
              {AGENCY_BOOKINGS.filter((b) => b.guest === selected.name).map((b) => (
                <div key={b.id} className="flex items-center justify-between">
                  <span>{b.resort} · {b.checkIn}</span>
                  <span className="text-slate-400">{b.category}</span>
                </div>
              ))}
              {AGENCY_BOOKINGS.filter((b) => b.guest === selected.name).length === 0 && (
                <div className="text-slate-400">No bookings on record.</div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 font-medium text-slate-800">{value}</div>
    </div>
  );
}
