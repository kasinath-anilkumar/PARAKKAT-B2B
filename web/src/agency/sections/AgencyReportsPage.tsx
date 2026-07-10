import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, PageHeader, Select, Stat, Tabs, inr, type Column } from '../../components/ui/kit';
import { AGENCY_AGENTS, AGENCY_PAYMENTS, CREDIT_SUMMARY, REVENUE_SERIES, type AgencyAgent } from '../mock';

function BarChart({ data }: { data: { month: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 text-sm font-semibold text-slate-700">Revenue trend</div>
      <div className="flex h-52 items-end gap-3">
        {data.map((d) => (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end">
              <div className="w-full rounded-t bg-blue-500/80" style={{ height: `${(d.value / max) * 100}%` }} title={inr(d.value)} />
            </div>
            <span className="text-xs text-slate-400">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgencyReportsPage() {
  const [tab, setTab] = useState('bookings');
  const [period, setPeriod] = useState('monthly');

  const agentCols: Column<AgencyAgent>[] = [
    { header: 'Agent', className: 'font-medium text-slate-800', render: (a) => a.name },
    { header: 'Bookings', align: 'right', render: (a) => a.bookings },
    { header: 'Revenue', align: 'right', className: 'font-medium text-slate-800', render: (a) => inr(a.revenue) },
    {
      header: 'Share',
      render: (a) => {
        const total = AGENCY_AGENTS.reduce((s, x) => s + x.revenue, 0);
        const pct = Math.round((a.revenue / total) * 100);
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

  const exportBtns = (
    <div className="flex gap-2">
      <Button variant="secondary">PDF</Button>
      <Button variant="secondary">Excel</Button>
      <Button variant="secondary">CSV</Button>
    </div>
  );

  return (
    <AppShell>
      <PageHeader title="Reports" subtitle="Booking, agent-performance and financial reports." actions={exportBtns} />

      <Tabs
        tabs={[
          { key: 'bookings', label: 'Booking Reports' },
          { key: 'agents', label: 'Agent Performance' },
          { key: 'financial', label: 'Financial' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'bookings' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Period</span>
            <Select
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Bookings" value={301} tone="blue" />
            <Stat label="Revenue" value={inr(REVENUE_SERIES.reduce((s, r) => s + r.value, 0))} tone="green" />
            <Stat label="Avg. value" value={inr(21500)} tone="violet" />
            <Stat label="Cancellations" value="4.2%" tone="amber" />
          </div>
          <BarChart data={REVENUE_SERIES} />
        </div>
      )}

      {tab === 'agents' && <DataTable columns={agentCols} rows={AGENCY_AGENTS} rowKey={(a) => a.id} />}

      {tab === 'financial' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Paid" value={inr(AGENCY_PAYMENTS.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0))} tone="green" />
            <Stat label="Pending" value={inr(AGENCY_PAYMENTS.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.amount, 0))} tone="amber" />
            <Stat label="Outstanding" value={inr(CREDIT_SUMMARY.outstanding)} tone="red" />
            <Stat label="Credit used" value={`${Math.round((CREDIT_SUMMARY.used / CREDIT_SUMMARY.limit) * 100)}%`} tone="violet" />
          </div>
          <DataTable
            columns={[
              { header: 'Payment', className: 'font-mono text-xs text-slate-600', render: (p: (typeof AGENCY_PAYMENTS)[number]) => p.id },
              { header: 'Booking', className: 'font-mono text-xs text-slate-600', render: (p: (typeof AGENCY_PAYMENTS)[number]) => p.booking },
              { header: 'Amount', align: 'right', className: 'font-medium text-slate-800', render: (p: (typeof AGENCY_PAYMENTS)[number]) => inr(p.amount) },
              { header: 'Date', render: (p: (typeof AGENCY_PAYMENTS)[number]) => p.date },
              { header: 'Status', render: (p: (typeof AGENCY_PAYMENTS)[number]) => <Badge tone={p.status === 'Paid' ? 'green' : p.status === 'Pending' ? 'amber' : 'violet'}>{p.status}</Badge> },
            ]}
            rows={AGENCY_PAYMENTS}
            rowKey={(p) => p.id}
          />
        </div>
      )}
    </AppShell>
  );
}
