import { useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Field, Input, Modal, PageHeader, SearchInput, Stat, Tabs, Toolbar, type Column } from '../../components/ui/kit';
import { CountUp } from '../../components/ui/CountUp';
import { AGENT_BOOKINGS, AGENT_GUESTS, type Guest } from '../mock';

const lift = 'transition duration-200 hover:-translate-y-0.5 hover:shadow-md';

export function AgentGuestsPage() {
  const [guests, setGuests] = useState<Guest[]>(AGENT_GUESTS);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Guest | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () =>
      guests.filter(
        (g) => (tab === 'all' || (tab === 'frequent' && g.frequent)) && [g.name, g.email, g.phone].some((f) => f.toLowerCase().includes(q.toLowerCase())),
      ),
    [guests, tab, q],
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
    {
      header: 'Actions',
      align: 'right',
      render: (g) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" onClick={() => setSelected(g)}>History</Button>
          <Button variant="secondary" onClick={() => alert(`${g.name}'s details pre-filled into a new booking.`)}>Reuse</Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Guest Management"
        subtitle="Save traveller details, view history and reuse guest info for faster bookings."
        actions={<Button variant="primary" onClick={() => setSaving(true)}>+ Save Guest</Button>}
      />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="My Guests" value={<CountUp to={guests.length} />} tone="blue" className={lift} />
        <Stat label="Frequent" value={<CountUp to={guests.filter((g) => g.frequent).length} />} tone="violet" className={lift} />
        <Stat label="Total Stays" value={<CountUp to={guests.reduce((s, g) => s + g.stays, 0)} />} tone="green" className={lift} />
        <Stat label="Repeat rate" value="58%" tone="sky" className={lift} />
      </div>

      <Tabs
        tabs={[
          { key: 'all', label: 'All Guests', count: guests.length },
          { key: 'frequent', label: 'Frequent Travellers', count: guests.filter((g) => g.frequent).length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search guests…" />
      </Toolbar>

      <DataTable columns={columns} rows={rows} rowKey={(g) => g.id} empty="No saved guests." />

      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)} wide>
          <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
            <Detail label="Phone" value={selected.phone} />
            <Detail label="Email" value={selected.email} />
            <Detail label="Total stays" value={selected.stays} />
            <Detail label="Last stay" value={selected.lastStay} />
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Booking history</div>
            <div className="space-y-1.5 text-sm text-slate-600">
              {AGENT_BOOKINGS.filter((b) => b.guest === selected.name).map((b) => (
                <div key={b.id} className="flex items-center justify-between">
                  <span>{b.resort} · {b.checkIn}</span>
                  <span className="text-slate-400">{b.category}</span>
                </div>
              ))}
              {AGENT_BOOKINGS.filter((b) => b.guest === selected.name).length === 0 && <div className="text-slate-400">No bookings on record.</div>}
            </div>
          </div>
        </Modal>
      )}

      {saving && (
        <Modal
          title="Save Guest Details"
          onClose={() => setSaving(false)}
          footer={
            <>
              <Button onClick={() => setSaving(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setGuests((p) => [{ id: `G-${p.length + 1}`, name: 'New Guest', phone: '+91 —', email: 'guest@example.com', stays: 0, lastStay: '—', frequent: false }, ...p]);
                  setSaving(false);
                }}
              >
                Save guest
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Field label="Full name"><Input placeholder="Guest name" /></Field>
            <Field label="Mobile number"><Input placeholder="+91 …" /></Field>
            <Field label="Email"><Input type="email" placeholder="guest@example.com" /></Field>
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
