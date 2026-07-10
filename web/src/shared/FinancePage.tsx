import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../components/layout/AppShell';
import { StatCard, inr } from '../components/dashboard/StatCard';
import { Icons } from '../components/layout/icons';
import { httpClient } from '../api/httpClient';
import * as dashboardApi from '../api/dashboard.api';
import { useAuth } from '../hooks/useAuth';
import type { Invoice } from '../types/dashboard';

export function FinancePage() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminFinance />;
  return <AgencyFinance />;
}

function AdminFinance() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['reconciliation'],
    queryFn: async () => (await httpClient.get('/finance/reconciliation')).data,
  });
  const flush = useMutation({
    mutationFn: async () => (await httpClient.post('/finance/crs/flush')).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reconciliation'] }),
  });
  const dunning = useMutation({
    mutationFn: async () =>
      (await httpClient.post('/finance/dunning/run')).data as {
        overdueInvoices: number;
        remindersSent: number;
        agenciesSuspended: number;
        creditAlerts: number;
      },
  });
  const { data: payments } = useQuery({ queryKey: ['admin-payments'], queryFn: dashboardApi.listPayments });
  const chargeback = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => dashboardApi.recordChargeback(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
    },
  });
  const doChargeback = (id: string) => {
    const reason = window.prompt('Reason for the chargeback (payment reversal):');
    if (reason && reason.trim().length >= 3) chargeback.mutate({ id, reason: reason.trim() });
  };

  return (
    <AppShell title="Finance">
      <div className="max-w-4xl space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Reconciliation</h2>
            {data && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${data.clean ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {data.clean ? 'No drift' : 'Drift detected'}
              </span>
            )}
          </div>
          {data && (
            <ul className="space-y-2 text-sm">
              <Row label="Committed bookings missing a reservation ref" value={data.committedWithoutAxisRef} />
              <Row label="Committed bookings missing an invoice" value={data.committedWithoutInvoice} />
              <Row label="Pending CRS events" value={data.pendingCrsEvents} />
              <Row label="Failed CRS events" value={data.failedCrsEvents} />
              <li className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Settlement</li>
              <Row label="Payments awaiting settlement" value={data.paymentsAwaitingSettlement ?? 0} />
              <Row label="Unmatched payments (no gateway ref)" value={data.unmatchedPayments ?? 0} />
              <Row label="Open chargebacks" value={data.openChargebacks ?? 0} />
              <Row label="Invoice ledger mismatches" value={data.invoiceLedgerMismatches ?? 0} />
            </ul>
          )}
          <button
            onClick={() => flush.mutate()}
            disabled={flush.isPending}
            className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
          >
            Flush CRS outbox
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Dunning &amp; overdue enforcement</h2>
          <p className="mb-4 text-xs text-slate-500">
            Notify agencies with overdue credit invoices, auto-suspend those past the threshold, and raise
            credit-utilisation alerts. Run this on a schedule in production.
          </p>
          {dunning.data && (
            <ul className="mb-4 space-y-2 text-sm">
              <Row label="Overdue invoices" value={dunning.data.overdueInvoices} />
              <Row label="Reminders sent" value={dunning.data.remindersSent} />
              <Row label="Agencies auto-suspended" value={dunning.data.agenciesSuspended} />
              <Row label="Credit-utilisation alerts" value={dunning.data.creditAlerts} />
            </ul>
          )}
          <button
            onClick={() => dunning.mutate()}
            disabled={dunning.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {dunning.isPending ? 'Running…' : 'Run dunning now'}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Payments &amp; chargebacks</h2>
          <p className="mb-4 text-xs text-slate-500">
            Recent inbound collections. Record a chargeback to reverse a disputed payment — the amount is
            re-opened as outstanding on the linked invoice and the agency is notified.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Agency</th>
                  <th className="pb-2">Invoice</th>
                  <th className="pb-2">Gateway ref</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {payments?.items.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2 text-slate-700">{p.agencyName}</td>
                    <td className="py-2 font-mono text-xs text-slate-500">{p.invoiceNumber ?? '—'}</td>
                    <td className="py-2 font-mono text-xs text-slate-500">{p.gatewayRef ?? '—'}</td>
                    <td className="py-2 text-right font-medium text-slate-900">{inr(p.amount)}</td>
                    <td className="py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${p.status === 'SUCCEEDED' ? 'bg-green-100 text-green-700' : p.status === 'CHARGEBACK' ? 'bg-red-100 text-red-700' : p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {p.status === 'SUCCEEDED' && !p.chargedBack ? (
                        <button
                          onClick={() => doChargeback(p.id)}
                          disabled={chargeback.isPending}
                          className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-600 disabled:opacity-50"
                        >
                          Chargeback
                        </button>
                      ) : p.chargedBack ? (
                        <span className="text-xs text-slate-400">reversed</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {payments && payments.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">No payments yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className={`font-semibold ${value > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{value}</span>
    </li>
  );
}

function AgencyFinance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: balance } = useQuery({ queryKey: ['balance'], queryFn: dashboardApi.getBalance });
  const { data: invoices } = useQuery({ queryKey: ['invoices'], queryFn: dashboardApi.listInvoices });
  const settle = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount?: number }) => dashboardApi.settleInvoice(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['agency-summary'] });
    },
  });
  const canSettle = user?.role === 'AGENCY';

  const remainingOf = (inv: Invoice) => Math.max(0, Number(inv.amount) - Number(inv.amountPaid ?? 0));
  const settlePartial = (inv: Invoice) => {
    const remaining = remainingOf(inv);
    const raw = window.prompt(`Amount to pay against ${inv.number} (remaining ${inr(remaining)}):`, String(remaining));
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
      window.alert(`Enter an amount between 0 and ${inr(remaining)}.`);
      return;
    }
    // Full remaining → omit amount so the backend settles cleanly to PAID.
    settle.mutate({ id: inv.id, amount: amount >= remaining ? undefined : amount });
  };
  const isPayable = (inv: Invoice) =>
    inv.paymentMode === 'CREDIT' && (inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID');

  return (
    <AppShell title="Invoices & balance">
      <div className="space-y-6">
        {balance && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Outstanding" value={inr(balance.outstanding)} icon={<Icons.reports />} accent="amber" />
            <StatCard label="Credit Limit" value={inr(balance.creditLimit)} icon={<Icons.finance />} accent="blue" />
            <StatCard label="Available" value={inr(balance.available)} icon={<Icons.agencies />} accent="green" />
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Invoices</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="pb-2">Number</th>
                <th className="pb-2">Mode</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Due</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2 text-right">Paid</th>
                <th className="pb-2 text-right">Remaining</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {invoices?.items.map((inv: Invoice) => {
                const paid = Number(inv.amountPaid ?? 0);
                const remaining = remainingOf(inv);
                const badge =
                  inv.status === 'PAID'
                    ? 'bg-green-100 text-green-700'
                    : inv.status === 'PARTIALLY_PAID'
                      ? 'bg-blue-100 text-blue-700'
                      : inv.status === 'ISSUED'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600';
                return (
                  <tr key={inv.id} className="border-t border-slate-100">
                    <td className="py-2 font-mono text-xs text-slate-600">{inv.number}</td>
                    <td className="py-2 text-slate-500">{inv.paymentMode}</td>
                    <td className="py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge}`}>
                        {inv.status === 'PARTIALLY_PAID' ? 'PARTIAL' : inv.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500">{inv.dueDate ? inv.dueDate.slice(0, 10) : '—'}</td>
                    <td className="py-2 text-right font-medium text-slate-900">{inr(Number(inv.amount))}</td>
                    <td className="py-2 text-right text-slate-500">{paid > 0 ? inr(paid) : '—'}</td>
                    <td className="py-2 text-right font-medium text-slate-700">{remaining > 0 ? inr(remaining) : '—'}</td>
                    <td className="py-2 text-right">
                      {canSettle && isPayable(inv) && (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => settle.mutate({ id: inv.id })}
                            disabled={settle.isPending}
                            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                          >
                            Settle
                          </button>
                          <button
                            onClick={() => settlePartial(inv)}
                            disabled={settle.isPending}
                            className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 disabled:opacity-50"
                          >
                            Part-pay
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {invoices?.items.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-slate-400">No invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
