import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Badge, PageHeader, Stat, inr, type Tone } from '../components/ui/kit';
import { CountUp } from '../components/ui/CountUp';
import { TrendChart, Donut } from '../components/dashboard/charts';
import { Icons } from '../components/layout/icons';
import { AGENT_ACTIVITY, AGENT_BOOKINGS, AGENT_WEEK_SERIES, type BookingCategory } from './mock';

const QUICK_ACTIONS = [
  { label: 'New Booking', to: '/book', primary: true },
  { label: 'Search Resorts', to: '/book' },
  { label: 'View My Bookings', to: '/agent/bookings' },
  { label: 'Download Voucher', to: '/agent/bookings' },
];

const CAT_TONE: Record<BookingCategory, Tone> = { Upcoming: 'blue', Completed: 'green', Cancelled: 'red', Pending: 'amber' };
const CAT_COLOR: Record<BookingCategory, string> = { Upcoming: '#3b82f6', Pending: '#f59e0b', Completed: '#22c55e', Cancelled: '#ef4444' };
const lift = 'transition duration-200 hover:-translate-y-0.5 hover:shadow-md';

export function AgentDashboard() {
  const count = (c: BookingCategory) => AGENT_BOOKINGS.filter((b) => b.category === c).length;
  const bookingValue = AGENT_BOOKINGS.filter((b) => b.category !== 'Cancelled').reduce((s, b) => s + b.amount, 0);

  const statusData = (['Upcoming', 'Pending', 'Completed', 'Cancelled'] as BookingCategory[])
    .map((c) => ({ name: c, value: count(c), color: CAT_COLOR[c] }))
    .filter((d) => d.value > 0);

  const kpis: { label: string; to: number; tone: Tone; fmt?: (n: number) => string; hint?: string }[] = [
    { label: 'My Bookings', to: AGENT_BOOKINGS.length, tone: 'blue' },
    { label: "Today's Bookings", to: 2, tone: 'sky' },
    { label: 'Upcoming Check-ins', to: count('Upcoming'), tone: 'violet' },
    { label: 'Upcoming Check-outs', to: 1, tone: 'violet' },
    { label: 'Pending Confirmations', to: count('Pending'), tone: 'amber' },
    { label: 'Cancelled', to: count('Cancelled'), tone: 'red' },
    { label: 'Booking Value', to: bookingValue, tone: 'green', fmt: inr, hint: 'My bookings' },
    { label: 'Completed', to: count('Completed'), tone: 'green' },
  ];

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.label} className="animate-fade-up" style={{ animationDelay: `${i * 45}ms` }}>
            <Stat label={k.label} tone={k.tone} hint={k.hint} className={lift} value={<CountUp to={k.to} format={k.fmt} />} />
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className={`animate-fade-up rounded-xl border border-slate-200 bg-white lg:col-span-2 ${lift}`} style={{ animationDelay: '120ms' }}>
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Booking trend · last 7 days</h2>
          </div>
          <div className="p-4">
            <TrendChart data={AGENT_WEEK_SERIES} moneyLabel="Booking value (₹)" height={240} />
          </div>
        </div>

        <div className={`animate-fade-up rounded-xl border border-slate-200 bg-white ${lift}`} style={{ animationDelay: '180ms' }}>
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Bookings by status</h2>
          </div>
          <div className="p-4">
            <Donut data={statusData} centerValue={String(AGENT_BOOKINGS.length)} centerLabel="Total" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className={`animate-fade-up rounded-xl border border-slate-200 bg-white lg:col-span-2 ${lift}`} style={{ animationDelay: '220ms' }}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Recent bookings</h2>
            <Link to="/agent/bookings" className="text-xs font-medium text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {AGENT_BOOKINGS.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-slate-50/70">
                <div>
                  <div className="font-medium text-slate-800">{b.guest}</div>
                  <div className="text-xs text-slate-400">{b.resort} · {b.checkIn}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-700">{inr(b.amount)}</span>
                  <Badge tone={CAT_TONE[b.category]}>{b.category}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`animate-fade-up rounded-xl border border-slate-200 bg-white ${lift}`} style={{ animationDelay: '280ms' }}>
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Recent activity</h2>
          </div>
          <div className="space-y-3 p-4">
            {AGENT_ACTIVITY.map((a) => {
              const Icon = Icons[a.icon];
              return (
                <div key={a.id} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm text-slate-700">{a.text}</div>
                    <div className="text-xs text-slate-400">{a.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
