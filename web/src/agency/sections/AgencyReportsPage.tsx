import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, DataTable, PageHeader, Stat, Tabs, inr, type Column, type Tone } from '../../components/ui/kit';
import { SkeletonStats } from '../../components/ui/Skeleton';
import * as agencyApi from '../../api/agency.api';
import type { AgencyReport } from '../../api/agency.api';

const PAY_TONE: Record<string, Tone> = { SUCCEEDED: 'green', PENDING: 'amber', FAILED: 'red', REFUNDED: 'violet', CHARGEBACK: 'red' };
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN');
const fmtMonth = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

function BarChart({ data }: { data: { month: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 text-sm font-semibold text-slate-700">Revenue trend</div>
      {data.every((d) => d.value === 0) ? (
        <div className="flex h-52 items-center justify-center text-sm text-slate-400">No revenue in this window.</div>
      ) : (
        <div className="flex h-52 items-end gap-3">
          {data.map((d) => (
            <div key={d.month} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div className="w-full rounded-t bg-blue-500/80" style={{ height: `${(d.value / max) * 100}%` }} title={inr(d.value)} />
              </div>
              <span className="text-xs text-slate-400">{fmtMonth(d.month)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AgencyReportsPage() {
  const [tab, setTab] = useState('bookings');
  const { data, isLoading } = useQuery({ queryKey: ['agency-report'], queryFn: agencyApi.getAgencyReport });

  const agentCols: Column<AgencyReport['agents'][number]>[] = [
    { header: 'Agent', className: 'font-medium text-slate-800', render: (a) => a.name },
    { header: 'Bookings', align: 'right', render: (a) => a.bookings },
    { header: 'Revenue', align: 'right', className: 'font-medium text-slate-800', render: (a) => inr(a.revenue) },
    {
      header: 'Share',
      render: (a) => {
        const total = data?.agents.reduce((s, x) => s + x.revenue, 0) ?? 0;
        const pct = total > 0 ? Math.round((a.revenue / total) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-slate-500">{pct}%</span>
          </div>
        );
      },
    },
  ];

  const payCols: Column<AgencyReport['financial']['payments'][number]>[] = [
    { header: 'Invoice', className: 'font-mono text-xs text-slate-600', render: (p) => p.invoiceNumber ?? '—' },
    { header: 'Amount', align: 'right', className: 'font-medium text-slate-800', render: (p) => inr(p.amount) },
    { header: 'Date', render: (p) => fmtDate(p.createdAt) },
    { header: 'Status', render: (p) => <Badge tone={PAY_TONE[p.status] ?? 'slate'}>{p.status}</Badge> },
  ];

  return (
    <AppShell>
      <PageHeader title="Reports" subtitle="Booking, agent-performance and financial reports · last 30 days." />

      <Tabs
        tabs={[
          { key: 'bookings', label: 'Booking Reports' },
          { key: 'agents', label: 'Agent Performance', count: data?.agents.length },
          { key: 'financial', label: 'Financial' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {isLoading || !data ? (
        <SkeletonStats count={4} />
      ) : (
        <>
          {tab === 'bookings' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Bookings" value={data.booking.totalBookings} tone="blue" />
                <Stat label="Revenue" value={inr(data.booking.revenue)} tone="green" />
                <Stat label="Avg. value" value={inr(data.booking.avgValue)} tone="violet" />
                <Stat label="Cancellations" value={`${data.booking.cancellationRate}%`} tone="amber" />
              </div>
              <BarChart data={data.booking.monthlySeries} />
            </div>
          )}

          {tab === 'agents' && <DataTable columns={agentCols} rows={data.agents} rowKey={(a) => a.id} empty="No agent activity in this window." />}

          {tab === 'financial' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Paid" value={inr(data.financial.paid)} tone="green" />
                <Stat label="Pending" value={inr(data.financial.pending)} tone="amber" />
                <Stat label="Outstanding" value={inr(data.financial.outstanding)} tone="red" />
                <Stat label="Credit used" value={`${data.financial.creditUsedPct}%`} tone="violet" />
              </div>
              <DataTable columns={payCols} rows={data.financial.payments} rowKey={(p) => p.id} empty="No payments recorded." />
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
