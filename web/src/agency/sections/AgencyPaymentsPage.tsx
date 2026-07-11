import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Field, Modal, PageHeader, Select, Stat, Tabs, inr, type Column, type Tone } from '../../components/ui/kit';
import { CountUp } from '../../components/ui/CountUp';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import * as dashboardApi from '../../api/dashboard.api';
import * as documentsApi from '../../api/documents.api';
import type { Invoice } from '../../types/dashboard';

const STATUS_TONE: Record<Invoice['status'], Tone> = { ISSUED: 'amber', PARTIALLY_PAID: 'blue', PAID: 'green', VOID: 'slate', REFUNDED: 'violet' };
const settleable = (i: Invoice) => (i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID') && i.paymentMode === 'CREDIT';
const remainingOf = (i: Invoice) => Math.max(0, Number(i.amount) - Number(i.amountPaid ?? 0));

export function AgencyPaymentsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canSettle = user?.role === 'AGENCY';
  const [tab, setTab] = useState('invoices');
  const [payOpen, setPayOpen] = useState(false);
  const [payId, setPayId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: balance } = useQuery({ queryKey: ['balance'], queryFn: dashboardApi.getBalance });
  const { data: invoices, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: dashboardApi.listInvoices });

  const settle = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount?: number }) => dashboardApi.settleInvoice(id, amount),
    onSuccess: () => {
      ['invoices', 'balance', 'agency-summary'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setPayOpen(false);
      setError(null);
    },
    onError: (e) => setError(extractError(e)),
  });

  const items = useMemo(() => invoices?.items ?? [], [invoices]);
  const latestInvoice = useMemo(
    () => [...items].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0],
    [items],
  );
  const runDownload = (fn: () => Promise<void>) => {
    fn().catch((e) => setError(extractError(e)));
  };
  const openInvoices = items.filter(settleable);
  const selectedInvoice = openInvoices.find((i) => i.id === payId);
  const selectedRemaining = selectedInvoice ? remainingOf(selectedInvoice) : 0;

  // Submit the modal: omit amount when paying the full remaining so it settles to PAID.
  const submitPayment = () => {
    if (!payId) return;
    const amount = payAmount.trim() === '' ? undefined : Number(payAmount);
    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0 || amount > selectedRemaining)) {
      setError(`Enter an amount between 0 and ${inr(selectedRemaining)}.`);
      return;
    }
    settle.mutate({ id: payId, amount: amount !== undefined && amount >= selectedRemaining ? undefined : amount });
  };
  const openPayModal = (id: string) => {
    setPayId(id);
    setPayAmount('');
    setError(null);
    setPayOpen(true);
  };
  const used = balance ? balance.creditLimit - balance.available : 0;
  const pct = balance && balance.creditLimit ? Math.round((used / balance.creditLimit) * 100) : 0;

  const invCols: Column<Invoice>[] = [
    { header: 'Invoice', className: 'font-mono text-xs text-slate-600', render: (i) => i.number },
    { header: 'Mode', render: (i) => i.paymentMode },
    { header: 'GST', render: (i) => <Badge tone="slate">{i.gstRate}%</Badge> },
    { header: 'Issued', render: (i) => i.issuedAt.slice(0, 10) },
    { header: 'Due', render: (i) => (i.dueDate ? i.dueDate.slice(0, 10) : '—') },
    { header: 'Total', align: 'right', className: 'font-medium text-slate-800', render: (i) => inr(Number(i.invoiceTotal || i.amount)) },
    { header: 'Remaining', align: 'right', render: (i) => (remainingOf(i) > 0 ? inr(remainingOf(i)) : '—') },
    { header: 'Status', render: (i) => <Badge tone={STATUS_TONE[i.status]}>{i.status === 'PARTIALLY_PAID' ? 'PARTIAL' : i.status}</Badge> },
    {
      header: 'Actions',
      align: 'right',
      render: (i) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" onClick={() => setViewing(i)}>View</Button>
          {canSettle && settleable(i) && <Button variant="secondary" disabled={settle.isPending} onClick={() => openPayModal(i.id)}>Settle</Button>}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Payments & Credit"
        subtitle="Your live credit position, invoices and financial documents."
        actions={canSettle ? <Button variant="primary" disabled={!openInvoices.length} onClick={() => openPayModal(openInvoices[0]?.id ?? '')}>Make Payment</Button> : undefined}
      />

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Credit dashboard (live) */}
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Credit Limit" value={balance ? <CountUp to={balance.creditLimit} format={inr} /> : '—'} tone="blue" />
        <Stat label="Available Credit" value={balance ? <CountUp to={balance.available} format={inr} /> : '—'} tone="green" />
        <Stat label="Used Credit" value={balance ? <CountUp to={used} format={inr} /> : '—'} tone="amber" />
        <Stat label="Outstanding" value={balance ? <CountUp to={balance.outstanding} format={inr} /> : '—'} tone="red" />
      </div>
      {balance && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Credit utilization</span>
            <span className="text-slate-500">{pct}% of {inr(balance.creditLimit)}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
      )}

      <Tabs
        tabs={[
          { key: 'invoices', label: 'Invoices', count: items.length },
          { key: 'documents', label: 'Financial Documents' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'invoices' &&
        (isLoading ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm"><tbody><SkeletonRows rows={5} cols={9} /></tbody></table>
          </div>
        ) : (
          <DataTable columns={invCols} rows={items} rowKey={(i) => i.id} empty="No invoices yet." />
        ))}

      {tab === 'documents' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              label: 'Latest Invoice',
              hint: latestInvoice ? latestInvoice.number : 'No invoices yet',
              disabled: !latestInvoice,
              action: () => documentsApi.downloadInvoicePdf(latestInvoice!.id, latestInvoice!.number),
            },
            { label: 'Credit Statement', hint: 'Open credit balance', disabled: false, action: () => documentsApi.downloadCreditStatement() },
            { label: 'Account Statement', hint: 'Full ledger', disabled: false, action: () => documentsApi.downloadAccountStatement() },
          ].map((d) => (
            <div key={d.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <div className="text-sm font-medium text-slate-700">{d.label}</div>
                <div className="text-xs text-slate-400">{d.hint}</div>
              </div>
              <Button variant="secondary" disabled={d.disabled} onClick={() => runDownload(d.action)}>Download</Button>
            </div>
          ))}
        </div>
      )}

      {payOpen && (
        <Modal
          title="Make Payment"
          onClose={() => setPayOpen(false)}
          footer={
            <>
              <Button onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button variant="primary" disabled={!payId || settle.isPending} onClick={submitPayment}>{settle.isPending ? 'Processing…' : 'Settle invoice'}</Button>
            </>
          }
        >
          {openInvoices.length === 0 ? (
            <p className="text-sm text-slate-500">No outstanding credit invoices to settle.</p>
          ) : (
            <div className="space-y-3">
              <Field label="Invoice to settle">
                <Select
                  value={payId}
                  onChange={(v) => { setPayId(v); setPayAmount(''); }}
                  options={openInvoices.map((i) => ({ value: i.id, label: `${i.number} · remaining ${inr(remainingOf(i))}` }))}
                />
              </Field>
              <Field label={`Amount (blank = full remaining ${inr(selectedRemaining)})`}>
                <input
                  type="number"
                  min={0}
                  max={selectedRemaining}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={String(selectedRemaining)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
              </Field>
              <p className="text-xs text-slate-400">Pay the full remaining balance, or enter a smaller amount for a partial payment. Partial payments leave the invoice open until fully settled.</p>
            </div>
          )}
        </Modal>
      )}

      {viewing && (
        <Modal
          title={`Tax Invoice · ${viewing.number}`}
          onClose={() => setViewing(null)}
          wide
          footer={<Button variant="primary" onClick={() => runDownload(() => documentsApi.downloadInvoicePdf(viewing.id, viewing.number))}>Download PDF</Button>}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[viewing.status]}>{viewing.status}</Badge>
            <Badge tone="blue">GST {viewing.gstRate}%</Badge>
            <Badge tone="slate">SAC {viewing.sac}</Badge>
            {viewing.irn && <Badge tone="green">IRN stamped</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Row label="Supplier GSTIN" value={viewing.supplierGstin ?? '—'} />
            <Row label="Recipient GSTIN" value={viewing.recipientGstin ?? '—'} />
            <Row label="Place of supply" value={viewing.placeOfSupply ? `State ${viewing.placeOfSupply}` : '—'} />
            <Row label="Payment mode" value={viewing.paymentMode} />
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <tbody>
                <TaxRow label="Taxable value" value={inr(Number(viewing.amount))} />
                {Number(viewing.cgst) > 0 && <TaxRow label={`CGST (${viewing.gstRate / 2}%)`} value={inr(Number(viewing.cgst))} />}
                {Number(viewing.sgst) > 0 && <TaxRow label={`SGST (${viewing.gstRate / 2}%)`} value={inr(Number(viewing.sgst))} />}
                {Number(viewing.igst) > 0 && <TaxRow label={`IGST (${viewing.gstRate}%)`} value={inr(Number(viewing.igst))} />}
                {viewing.gstRate === 0 && <TaxRow label="GST" value="Exempt (≤ ₹1,000/night)" />}
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-3 py-2 font-semibold text-slate-800">Invoice total</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{inr(Number(viewing.invoiceTotal || viewing.amount))}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {viewing.irn && <div className="mt-2 break-all text-xs text-slate-400">IRN: <span className="font-mono">{viewing.irn}</span></div>}

          {viewing.creditNotes && viewing.creditNotes.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Credit notes</div>
              <div className="space-y-2">
                {viewing.creditNotes.map((cn) => (
                  <div key={cn.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-sm">
                    <div>
                      <div className="font-mono text-xs text-slate-600">{cn.number}</div>
                      <div className="text-xs text-slate-400">{cn.reason}</div>
                    </div>
                    <div className="text-right"><div className="font-medium text-slate-800">{inr(Number(cn.total))}</div><div className="text-[11px] text-slate-400">GST {cn.gstRate}%</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 font-medium text-slate-800">{value}</div>
    </div>
  );
}

function TaxRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-3 py-2 text-slate-600">{label}</td>
      <td className="px-3 py-2 text-right text-slate-800">{value}</td>
    </tr>
  );
}

function extractError(err: unknown): string {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Something went wrong';
}
