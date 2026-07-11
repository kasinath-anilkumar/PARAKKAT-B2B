import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Badge, PageHeader, Stat, inr, type Tone } from '../components/ui/kit';
import { CountUp } from '../components/ui/CountUp';
import { StatusDonut, TrendChart } from '../components/dashboard/charts';
import { SkeletonStats, SkeletonChart, SkeletonTable } from '../components/ui/Skeleton';
import * as dashboardApi from '../api/dashboard.api';
import type { BookingState } from '../types/booking';

const QUICK_ACTIONS = [
  { label: 'New Booking', to: '/book', primary: true },
  { label: 'Search Resorts', to: '/book' },
  { label: 'View My Bookings', to: '/agent/bookings' },
];

const STATE_TONE: Record<string, Tone> = {
  DRAFT: 'slate',
  AWAITING_PAYMENT: 'amber',
  CONFIRMED_ON_CREDIT: 'blue',
  PAID: 'blue',
  CONFIRMED: 'green',
  COMMITTED: 'green',
  COMMIT_FAILED: 'red',
  CANCELLED: 'red',
  EXPIRED: 'slate',
};
const lift = 'transition duration-200 hover:-translate-y-0.5 hover:shadow-md';

export function AgentDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['agent-summary'],
    queryFn: dashboardApi.getAgentSummary,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const countOf = (states: BookingState[]) =>
    (data?.bookingsByStatus ?? []).filter((s) => states.includes(s.state)).reduce((n, s) => n + s.count, 0);

  const kpis: { label: string; to: number; tone: Tone; fmt?: (n: number) => string; hint?: string }[] = data
    ? [
        { label: 'My Bookings', to: data.kpis.totalBookings, tone: 'blue' },
        { label: "Today's Bookings", to: data.kpis.todayBookings, tone: 'sky' },
        { label: 'Upcoming Check-ins', to: data.kpis.upcomingCheckIns, tone: 'violet' },
        { label: 'Confirmed', to: countOf(['CONFIRMED_ON_CREDIT', 'PAID', 'CONFIRMED', 'COMMITTED']), tone: 'green' },
        { label: 'Pending', to: countOf(['DRAFT', 'AWAITING_PAYMENT']), tone: 'amber' },
        { label: 'Cancelled', to: countOf(['CANCELLED', 'EXPIRED']), tone: 'red' },
        { label: 'Booking Value', to: data.kpis.totalSpend, tone: 'green', fmt: inr, hint: 'My bookings' },
      ]
    : [];

  return (
    <AppShell>
      <PageHeader title="My Overview" subtitle="Your bookings, activity and quick actions at a glance." />

      <div className="animate-fade-up mb-4 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              a.primary ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {a.label}
          </Link>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          <SkeletonStats count={4} />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <SkeletonChart className="h-60 lg:col-span-2" />
            <SkeletonChart className="h-60" />
          </div>
          <SkeletonTable rows={5} cols={3} />
        </div>
      )}
      {isError && <p className="text-sm text-red-600">Failed to load your overview.</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {kpis.map((k, i) => (
              <div key={k.label} className="animate-fade-up" style={{ animationDelay: `${i * 45}ms` }}>
                <Stat label={k.label} tone={k.tone} hint={k.hint} className={lift} value={<CountUp to={k.to} format={k.fmt} />} />
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className={`animate-fade-up rounded-xl border border-slate-200 bg-white lg:col-span-2 ${lift}`} style={{ animationDelay: '120ms' }}>
              <div className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-slate-700">Booking trend · last 7 days</h2></div>
              <div className="p-4">
                <TrendChart data={data.series.map((s) => ({ day: s.day, bookings: s.bookings, value: s.spend }))} moneyLabel="Booking value (₹)" height={240} />
              </div>
            </div>
            <div className={`animate-fade-up rounded-xl border border-slate-200 bg-white ${lift}`} style={{ animationDelay: '180ms' }}>
              <div className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-slate-700">Bookings by status</h2></div>
              <div className="p-4"><StatusDonut data={data.bookingsByStatus} /></div>
            </div>
          </div>

          <div className={`animate-fade-up mt-4 rounded-xl border border-slate-200 bg-white ${lift}`} style={{ animationDelay: '220ms' }}>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-700">Recent bookings</h2>
              <Link to="/agent/bookings" className="text-xs font-medium text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {data.recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-slate-50/70">
                  <div>
                    <div className="font-medium text-slate-800">{b.resortName}</div>
                    <div className="text-xs text-slate-400">{b.roomTypeName} · {b.checkIn.slice(0, 10)} → {b.checkOut.slice(0, 10)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-700">{inr(b.agencyPrice)}</span>
                    <Badge tone={STATE_TONE[b.state] ?? 'slate'}>{b.state.replace(/_/g, ' ')}</Badge>
                  </div>
                </div>
              ))}
              {data.recentBookings.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-400">No bookings yet.</div>}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
