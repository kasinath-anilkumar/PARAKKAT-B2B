import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { SkeletonTable } from '../components/ui/Skeleton';
import * as bookingApi from '../api/booking.api';
import type { Booking, BookingState } from '../types/booking';

function money(n: number | string) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

const STATE_STYLE: Record<BookingState, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  AWAITING_PAYMENT: 'bg-amber-100 text-amber-700',
  CONFIRMED_ON_CREDIT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  COMMITTED: 'bg-green-100 text-green-700',
  COMMIT_FAILED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-red-100 text-red-700',
};

export function BookingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['bookings'], queryFn: bookingApi.listBookings });

  // Paying/cancelling changes bookings, balance/credit, invoices and the dashboard.
  const refreshAll = () => {
    ['bookings', 'balance', 'invoices', 'agency-summary'].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k] }),
    );
  };
  const payMutation = useMutation({ mutationFn: bookingApi.payBooking, onSuccess: refreshAll });
  const cancelMutation = useMutation({ mutationFn: bookingApi.cancelBooking, onSuccess: refreshAll });

  const busy = payMutation.isPending || cancelMutation.isPending;

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">My bookings</h1>
        <Link to="/book" className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
          New booking
        </Link>
      </div>

      {isLoading && <SkeletonTable rows={6} cols={5} />}

      {data && (
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2">Resort / Room</th>
              <th className="py-2">Dates</th>
              <th className="py-2">Price</th>
              <th className="py-2">State</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {data.items.map((b: Booking) => (
              <tr key={b.id} className="border-b border-slate-100 align-top">
                <td className="py-2">
                  <div className="font-medium text-slate-900">{b.resortName}</div>
                  <div className="text-xs text-slate-500">{b.roomTypeName}</div>
                </td>
                <td className="py-2 text-slate-600">
                  {b.checkIn} → {b.checkOut}
                  <div className="text-xs text-slate-400">{b.nights} night(s)</div>
                </td>
                <td className="py-2">{money(b.agencyPrice)}</td>
                <td className="py-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATE_STYLE[b.state]}`}>
                    {b.state}
                  </span>
                </td>
                <td className="py-2 text-right">
                  {b.state === 'AWAITING_PAYMENT' && (
                    <button
                      onClick={() => payMutation.mutate(b.id)}
                      disabled={busy}
                      className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Pay
                    </button>
                  )}
                  {['COMMITTED', 'AWAITING_PAYMENT', 'CONFIRMED_ON_CREDIT'].includes(b.state) && (
                    <button
                      onClick={() => cancelMutation.mutate(b.id)}
                      disabled={busy}
                      className="ml-2 rounded bg-slate-200 px-3 py-1 text-xs font-medium text-slate-800 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )}
    </AppShell>
  );
}
