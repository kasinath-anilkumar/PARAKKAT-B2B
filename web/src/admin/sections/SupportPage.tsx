import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, PageHeader, SearchInput, Select, Stat, Toolbar, type Column } from '../../components/ui/kit';
import { SkeletonRows } from '../../components/ui/Skeleton';
import * as supportApi from '../../api/support.api';
import type { SupportStatus, TicketSummary } from '../../api/support.api';
import { PRIORITY_TONE, STATUS_TONE, TicketModal } from '../../shared/SupportTicketModal';

const fmt = (d: string) => new Date(d).toLocaleString('en-IN');

export function SupportPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<SupportStatus | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: tickets = [], isLoading } = useQuery({ queryKey: ['support', 'all'], queryFn: () => supportApi.listTickets() });

  const rows = useMemo(
    () =>
      tickets.filter(
        (t) => (status === 'all' || t.status === status) && [t.subject, t.agencyName, t.id].some((f) => f.toLowerCase().includes(q.toLowerCase())),
      ),
    [tickets, q, status],
  );

  const columns: Column<TicketSummary>[] = [
    { header: 'Subject', className: 'font-medium text-slate-800', render: (t) => t.subject },
    { header: 'Agency', render: (t) => t.agencyName },
    { header: 'Category', render: (t) => t.category ?? '—' },
    { header: 'Priority', render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge> },
    { header: 'Status', render: (t) => <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge> },
    { header: 'Updated', render: (t) => <span className="text-slate-500">{fmt(t.updatedAt)}</span> },
    { header: 'Actions', align: 'right', render: (t) => <Button variant="ghost" onClick={() => setOpenId(t.id)}>Open</Button> },
  ];

  const count = (s: SupportStatus) => tickets.filter((t) => t.status === s).length;

  return (
    <AppShell>
      <PageHeader title="Support" subtitle="Agency support tickets — respond, add internal notes and manage status." />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open" value={count('OPEN')} tone="red" />
        <Stat label="Pending" value={count('PENDING')} tone="amber" />
        <Stat label="Resolved" value={count('RESOLVED')} tone="green" />
        <Stat label="High priority" value={tickets.filter((t) => t.priority === 'HIGH').length} tone="violet" />
      </div>

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search tickets…" />
        <Select
          value={status}
          onChange={(v) => setStatus(v as SupportStatus | 'all')}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'OPEN', label: 'Open' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'RESOLVED', label: 'Resolved' },
            { value: 'CLOSED', label: 'Closed' },
          ]}
        />
      </Toolbar>

      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm"><tbody><SkeletonRows rows={6} cols={7} /></tbody></table>
        </div>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(t) => t.id} empty="No tickets match your filters." />
      )}

      {openId && <TicketModal id={openId} isAdmin onClose={() => setOpenId(null)} />}
    </AppShell>
  );
}
