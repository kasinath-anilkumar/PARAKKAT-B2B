import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Modal, PageHeader, SearchInput, Stat, Tabs, Toolbar, inr, type Column } from '../../components/ui/kit';
import { SkeletonRows } from '../../components/ui/Skeleton';
import * as bookingApi from '../../api/booking.api';
import type { GuestSummary } from '../../api/booking.api';

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

export function GuestsPage() {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<GuestSummary | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['guests'], queryFn: bookingApi.listGuests });
  const guests = data?.guests ?? [];
  const frequentCount = guests.filter((g) => g.frequent).length;
  const repeatRate = guests.length ? Math.round((guests.filter((g) => g.stays > 1).length / guests.length) * 100) : 0;

  const rows = useMemo(
    () =>
      (data?.guests ?? []).filter(
        (g) =>
          (tab === 'all' || (tab === 'frequent' && g.frequent)) &&
          [g.name, g.email ?? '', g.phone ?? ''].some((f) => f.toLowerCase().includes(q.toLowerCase())),
      ),
    [data, tab, q],
  );

  const columns: Column<GuestSummary>[] = [
    {
      header: 'Guest',
      render: (g) => (
        <div>
          <div className="font-medium text-slate-800">{g.name}</div>
          <div className="text-xs text-slate-400">{g.email ?? '—'}</div>
        </div>
      ),
    },
    { header: 'Phone', render: (g) => <span className="text-slate-500">{g.phone ?? '—'}</span> },
    { header: 'Stays', align: 'right', render: (g) => g.stays },
    { header: 'Total value', align: 'right', className: 'font-medium text-slate-800', render: (g) => inr(g.totalSpend) },
    { header: 'Last stay', render: (g) => fmtDate(g.lastStay) },
    { header: 'Tag', render: (g) => (g.frequent ? <Badge tone="violet">Frequent</Badge> : <span className="text-slate-300">—</span>) },
    { header: 'Actions', align: 'right', render: (g) => <Button variant="ghost" onClick={() => setSelected(g)}>View history</Button> },
  ];

  return (
    <AppShell>
      <PageHeader title="Guest Management" subtitle="Guest profiles and stay history, derived from your bookings." />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Guests" value={guests.length} tone="blue" />
        <Stat label="Frequent" value={frequentCount} tone="violet" />
        <Stat label="Total Stays" value={data?.totalStays ?? 0} tone="green" />
        <Stat label="Repeat rate" value={`${repeatRate}%`} tone="sky" />
      </div>

      <Tabs
        tabs={[
          { key: 'all', label: 'All Guests', count: guests.length },
          { key: 'frequent', label: 'Frequent', count: frequentCount },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search guests…" />
      </Toolbar>

      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm"><tbody><SkeletonRows rows={6} cols={7} /></tbody></table>
        </div>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(g) => g.key} empty="No guests yet — they appear here once you record bookings with guest details." />
      )}

      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)} wide>
          <div className="mb-3 grid grid-cols-2 gap-4 text-sm">
            <Detail label="Phone" value={selected.phone ?? '—'} />
            <Detail label="Email" value={selected.email ?? '—'} />
            <Detail label="Total stays" value={selected.stays} />
            <Detail label="Total value" value={inr(selected.totalSpend)} />
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Stay history</div>
            <div className="space-y-1.5 text-sm text-slate-600">
              {selected.bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between">
                  <span>{b.resortName} · {fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-slate-400">{inr(b.agencyPrice)}</span>
                    <Badge tone={b.state === 'CANCELLED' || b.state === 'EXPIRED' ? 'red' : 'green'}>{b.state.replace(/_/g, ' ')}</Badge>
                  </span>
                </div>
              ))}
              {selected.bookings.length === 0 && <div className="text-slate-400">No bookings on record.</div>}
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
