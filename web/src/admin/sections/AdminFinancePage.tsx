import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, PageHeader, Stat, Tabs, inr, type Column, type Tone } from '../../components/ui/kit';
import {
  CREDIT,
  INVOICES,
  PAYMENTS,
  REFUNDS,
  type MockCredit,
  type MockInvoice,
  type MockPayment,
  type MockRefund,
  type PayStatus,
} from '../mock';

const PAY_TONE: Record<PayStatus, Tone> = { Paid: 'green', Pending: 'amber', Failed: 'red', Refunded: 'violet' };

export function AdminFinancePage() {
  const [tab, setTab] = useState('payments');
  const [credit, setCredit] = useState<MockCredit[]>(CREDIT);
  const [refunds, setRefunds] = useState<MockRefund[]>(REFUNDS);

  const payCols: Column<MockPayment>[] = [
    { header: 'Payment ID', className: 'font-mono text-xs text-slate-600', render: (p) => p.id },
    { header: 'Booking', className: 'font-mono text-xs text-slate-600', render: (p) => p.booking },
    { header: 'Agency', render: (p) => p.agency },
    { header: 'Method', render: (p) => p.method },
    { header: 'Amount', align: 'right', className: 'font-medium text-slate-800', render: (p) => inr(p.amount) },
    { header: 'Status', render: (p) => <Badge tone={PAY_TONE[p.status]}>{p.status}</Badge> },
  ];

  const invCols: Column<MockInvoice>[] = [
    { header: 'Invoice', className: 'font-mono text-xs text-slate-600', render: (i) => i.id },
    { header: 'Agency', render: (i) => i.agency },
    { header: 'Amount', align: 'right', className: 'font-medium text-slate-800', render: (i) => inr(i.amount) },
    { header: 'Issued', render: (i) => i.issued },
    { header: 'Due', render: (i) => i.due },
    { header: 'Status', render: (i) => <Badge tone={i.status === 'Paid' ? 'green' : i.status === 'Overdue' ? 'red' : 'amber'}>{i.status}</Badge> },
    { header: '', align: 'right', render: () => <Button variant="ghost">Download</Button> },
  ];

  const creditCols: Column<MockCredit>[] = [
    { header: 'Agency', className: 'font-medium text-slate-800', render: (c) => c.agency },
    { header: 'Limit', align: 'right', render: (c) => inr(c.limit) },
    { header: 'Used', align: 'right', render: (c) => inr(c.used) },
    {
      header: 'Utilization',
      render: (c) => {
        const pct = Math.round((c.used / c.limit) * 100);
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-slate-500">{pct}%</span>
          </div>
        );
      },
    },
    { header: 'Status', render: (c) => <Badge tone={c.status === 'Active' ? 'green' : 'red'}>{c.status}</Badge> },
    {
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <Button
          variant={c.status === 'Active' ? 'danger' : 'secondary'}
          onClick={() => setCredit((p) => p.map((x) => (x.id === c.id ? { ...x, status: x.status === 'Active' ? 'Frozen' : 'Active' } : x)))}
        >
          {c.status === 'Active' ? 'Freeze' : 'Unfreeze'}
        </Button>
      ),
    },
  ];

  const refundCols: Column<MockRefund>[] = [
    { header: 'Refund', className: 'font-mono text-xs text-slate-600', render: (r) => r.id },
    { header: 'Booking', className: 'font-mono text-xs text-slate-600', render: (r) => r.booking },
    { header: 'Agency', render: (r) => r.agency },
    { header: 'Amount', align: 'right', className: 'font-medium text-slate-800', render: (r) => inr(r.amount) },
    { header: 'Reason', render: (r) => <span className="text-slate-500">{r.reason}</span> },
    { header: 'Status', render: (r) => <Badge tone={r.status === 'Processed' || r.status === 'Approved' ? 'green' : r.status === 'Rejected' ? 'red' : 'amber'}>{r.status}</Badge> },
    {
      header: 'Actions',
      align: 'right',
      render: (r) =>
        r.status === 'Requested' ? (
          <div className="flex justify-end gap-1.5">
            <Button variant="secondary" onClick={() => setRefunds((p) => p.map((x) => (x.id === r.id ? { ...x, status: 'Approved' } : x)))}>Approve</Button>
            <Button variant="danger" onClick={() => setRefunds((p) => p.map((x) => (x.id === r.id ? { ...x, status: 'Rejected' } : x)))}>Reject</Button>
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ];

  const totalCollected = PAYMENTS.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const pendingAmt = PAYMENTS.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
  const outstanding = INVOICES.filter((i) => i.status !== 'Paid').reduce((s, i) => s + i.amount, 0);

  return (
    <AppShell>
      <PageHeader
        title="Finance"
        subtitle="Payments, credit, invoices and refunds across all agencies."
        actions={<Button variant="primary">+ Manual Payment</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Collected" value={inr(totalCollected)} tone="green" />
        <Stat label="Pending" value={inr(pendingAmt)} tone="amber" />
        <Stat label="Outstanding" value={inr(outstanding)} tone="red" />
        <Stat label="Refunds (open)" value={refunds.filter((r) => r.status === 'Requested').length} tone="violet" />
      </div>

      <Tabs
        tabs={[
          { key: 'payments', label: 'Payments', count: PAYMENTS.length },
          { key: 'credit', label: 'Credit', count: credit.length },
          { key: 'invoices', label: 'Invoices', count: INVOICES.length },
          { key: 'refunds', label: 'Refunds', count: refunds.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'payments' && <DataTable columns={payCols} rows={PAYMENTS} rowKey={(p) => p.id} />}
      {tab === 'credit' && <DataTable columns={creditCols} rows={credit} rowKey={(c) => c.id} />}
      {tab === 'invoices' && <DataTable columns={invCols} rows={INVOICES} rowKey={(i) => i.id} />}
      {tab === 'refunds' && <DataTable columns={refundCols} rows={refunds} rowKey={(r) => r.id} />}
    </AppShell>
  );
}
