import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Field, Input, Modal, PageHeader, Stat, Tabs, inr, type Column, type Tone } from '../../components/ui/kit';
import { AGENCY_INVOICES, AGENCY_PAYMENTS, CREDIT_SUMMARY, type AgencyInvoice, type AgencyPayment, type PayState } from '../mock';

const PAY_TONE: Record<PayState, Tone> = { Paid: 'green', Pending: 'amber', Refunded: 'violet', Failed: 'red' };

export function AgencyPaymentsPage() {
  const [tab, setTab] = useState('payments');
  const [payOpen, setPayOpen] = useState(false);

  const pct = Math.round((CREDIT_SUMMARY.used / CREDIT_SUMMARY.limit) * 100);

  const payCols: Column<AgencyPayment>[] = [
    { header: 'Payment ID', className: 'font-mono text-xs text-slate-600', render: (p) => p.id },
    { header: 'Booking', className: 'font-mono text-xs text-slate-600', render: (p) => p.booking },
    { header: 'Method', render: (p) => p.method },
    { header: 'Amount', align: 'right', className: 'font-medium text-slate-800', render: (p) => inr(p.amount) },
    { header: 'Date', render: (p) => p.date },
    { header: 'Status', render: (p) => <Badge tone={PAY_TONE[p.status]}>{p.status}</Badge> },
  ];

  const invCols: Column<AgencyInvoice>[] = [
    { header: 'Invoice', className: 'font-mono text-xs text-slate-600', render: (i) => i.id },
    { header: 'Amount', align: 'right', className: 'font-medium text-slate-800', render: (i) => inr(i.amount) },
    { header: 'Issued', render: (i) => i.issued },
    { header: 'Due', render: (i) => i.due },
    { header: 'Status', render: (i) => <Badge tone={i.status === 'Paid' ? 'green' : i.status === 'Overdue' ? 'red' : 'amber'}>{i.status}</Badge> },
    { header: '', align: 'right', render: () => <Button variant="ghost">Download</Button> },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Payments & Credit"
        subtitle="Your credit position, payment history and financial documents."
        actions={<Button variant="primary" onClick={() => setPayOpen(true)}>Make Payment</Button>}
      />

      {/* Credit dashboard */}
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Credit Limit" value={inr(CREDIT_SUMMARY.limit)} tone="blue" />
        <Stat label="Available Credit" value={inr(CREDIT_SUMMARY.available)} tone="green" />
        <Stat label="Used Credit" value={inr(CREDIT_SUMMARY.used)} tone="amber" />
        <Stat label="Outstanding" value={inr(CREDIT_SUMMARY.outstanding)} tone="red" />
      </div>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Credit utilization</span>
          <span className="text-slate-500">{pct}% of {inr(CREDIT_SUMMARY.limit)}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'payments', label: 'Payment History', count: AGENCY_PAYMENTS.length },
          { key: 'documents', label: 'Financial Documents' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'payments' && <DataTable columns={payCols} rows={AGENCY_PAYMENTS} rowKey={(p) => p.id} />}

      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {['Latest Invoice', 'Credit Statement', 'Account Statement'].map((d) => (
              <div key={d} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <span className="text-sm font-medium text-slate-700">{d}</span>
                <Button variant="secondary">Download</Button>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">Invoices</div>
            <DataTable columns={invCols} rows={AGENCY_INVOICES} rowKey={(i) => i.id} />
          </div>
        </div>
      )}

      {payOpen && (
        <Modal
          title="Make Payment"
          onClose={() => setPayOpen(false)}
          footer={
            <>
              <Button onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setPayOpen(false)}>Pay via Airpay</Button>
            </>
          }
        >
          <div className="space-y-3">
            <Field label="Amount (₹)"><Input type="number" defaultValue={CREDIT_SUMMARY.outstanding} /></Field>
            <Field label="Against invoice"><Input defaultValue="INV-2026-0341" /></Field>
            <Field label="Payment proof (optional)" hint="Upload if paying by bank transfer">
              <input type="file" className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm" />
            </Field>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
