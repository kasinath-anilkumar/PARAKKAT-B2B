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

  return (
    <AppShell title="Finance">
      <div className="max-w-2xl space-y-4">
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
    mutationFn: dashboardApi.settleInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['agency-summary'] });
    },
  });
  const canSettle = user?.role === 'AGENCY';

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
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {invoices?.items.map((inv: Invoice) => (
                <tr key={inv.id} className="border-t border-slate-100">
                  <td className="py-2 font-mono text-xs text-slate-600">{inv.number}</td>
                  <td className="py-2 text-slate-500">{inv.paymentMode}</td>
                  <td className="py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' : inv.status === 'ISSUED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2 text-slate-500">{inv.dueDate ? inv.dueDate.slice(0, 10) : '—'}</td>
                  <td className="py-2 text-right font-medium text-slate-900">{inr(Number(inv.amount))}</td>
                  <td className="py-2 text-right">
                    {canSettle && inv.status === 'ISSUED' && inv.paymentMode === 'CREDIT' && (
                      <button
                        onClick={() => settle.mutate(inv.id)}
                        disabled={settle.isPending}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                      >
                        Settle
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices?.items.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-400">No invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
