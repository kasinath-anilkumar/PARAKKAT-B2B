import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { inr } from '../components/dashboard/StatCard';
import { Donut, TrendChart } from '../components/dashboard/charts';
import { Icons, type IconName } from '../components/layout/icons';
import * as dashboardApi from '../api/dashboard.api';
import { SkeletonStats, SkeletonChart, SkeletonTable } from '../components/ui/Skeleton';
import type { AdminSummary, RecentBooking } from '../types/dashboard';

// --- KPI card with delta ------------------------------------------------------
type Accent = 'blue' | 'green' | 'amber' | 'violet' | 'sky' | 'rose';
const ACCENT: Record<Accent, string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  sky: 'bg-sky-50 text-sky-600',
  rose: 'bg-rose-50 text-rose-600',
};

function Kpi({ label, value, icon, accent, delta, up }: { label: string; value: string; icon: IconName; accent: Accent; delta: string; up: boolean }) {
  const Icon = Icons[icon];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${ACCENT[accent]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 flex items-center gap-1 text-[11px]">
        <span className={up ? 'text-green-600' : 'text-rose-600'}>{up ? '▲' : '▼'} {delta}</span>
        <span className="text-slate-400">vs prev</span>
      </div>
    </div>
  );
}

function Card({ title, action, children, className = '' }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-3 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const STATE_DOT: Record<string, string> = {
  COMMITTED: 'text-green-600',
  CANCELLED: 'text-rose-600',
  EXPIRED: 'text-rose-600',
  AWAITING_PAYMENT: 'text-amber-600',
};
function stateLabel(s: string) {
  return s === 'COMMITTED' ? 'Confirmed' : s === 'AWAITING_PAYMENT' ? 'Pending' : s === 'CANCELLED' ? 'Cancelled' : s === 'EXPIRED' ? 'No Show' : 'Pending';
}

function bookingStatusDonut(data: AdminSummary['bookingsByStatus']) {
  const buckets = { Confirmed: 0, Pending: 0, Cancelled: 0, 'No Show': 0 } as Record<string, number>;
  for (const s of data) {
    if (s.state === 'COMMITTED') buckets.Confirmed += s.count;
    else if (s.state === 'CANCELLED') buckets.Cancelled += s.count;
    else if (s.state === 'EXPIRED') buckets['No Show'] += s.count;
    else buckets.Pending += s.count;
  }
  return [
    { name: 'Confirmed', value: buckets.Confirmed, color: '#22c55e' },
    { name: 'Pending', value: buckets.Pending, color: '#f59e0b' },
    { name: 'Cancelled', value: buckets.Cancelled, color: '#ef4444' },
    { name: 'No Show', value: buckets['No Show'], color: '#cbd5e1' },
  ];
}

const SYSTEM_STATUS = [
  { name: 'CRS Synchronization', detail: 'Last sync: 2 mins ago', status: 'Healthy' },
  { name: 'Airpay Payment Gateway', detail: 'All systems operational', status: 'Healthy' },
  { name: 'Email Service', detail: 'Last email sent: 1 min ago', status: 'Healthy' },
  { name: 'SMS Service', detail: 'Last SMS sent: 5 mins ago', status: 'Healthy' },
  { name: 'WhatsApp Service', detail: 'Last message: 12 mins ago', status: 'Warning' },
];

const APPROVALS = [
  { icon: 'agencies' as IconName, kind: 'Agency Registration', name: 'Global Holidays' },
  { icon: 'shield' as IconName, kind: 'eKYC Verification', name: 'Travel India Pvt Ltd' },
  { icon: 'finance' as IconName, kind: 'Credit Limit Increase', name: 'Holiday Planners' },
  { icon: 'sync' as IconName, kind: 'Refund Request', name: 'BK-250515-00110' },
];

const GRADIENTS = ['from-sky-400 to-blue-500', 'from-emerald-400 to-green-500', 'from-amber-400 to-orange-500', 'from-violet-400 to-purple-500', 'from-rose-400 to-pink-500', 'from-cyan-400 to-teal-500'];

export function AdminDashboard() {
  const [period, setPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const { data, isLoading } = useQuery({ queryKey: ['admin-summary'], queryFn: dashboardApi.getAdminSummary });

  return (
    <AppShell title="Dashboard">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
          <Icons.bookings className="h-4 w-4 text-slate-400" />
          Last 7 days
        </div>
        <QuickActions />
      </div>

      {isLoading && (
        <div className="space-y-3">
          <SkeletonStats count={6} />
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
            <SkeletonChart className="h-64 xl:col-span-2" />
            <SkeletonChart className="h-64" />
            <SkeletonChart className="h-64" />
          </div>
          <SkeletonTable rows={6} />
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Total Bookings" value={data.kpis.totalBookings.toLocaleString('en-IN')} icon="bookings" accent="blue" delta="12.5%" up />
            <Kpi label="Total Revenue" value={inr(data.kpis.totalRevenue)} icon="finance" accent="green" delta="18.3%" up />
            <Kpi label="Outstanding Credit" value={inr(data.kpis.outstandingAmount)} icon="pricing" accent="amber" delta="9.8%" up={false} />
            <Kpi label="Pending Payments" value={inr(data.paymentOverview.pending)} icon="reports" accent="violet" delta="7.2%" up={false} />
            <Kpi label="Active Agencies" value={data.kpis.activeAgencies.toLocaleString('en-IN')} icon="agencies" accent="sky" delta="6.2%" up />
            <Kpi label="Occupancy Rate" value="68.5%" icon="resorts" accent="rose" delta="4.1%" up />
          </div>

          {/* Row 1: trend + status + recent */}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
            <Card
              title="Booking Trend"
              className="xl:col-span-2"
              action={
                <div className="flex rounded-md bg-slate-100 p-0.5 text-xs">
                  {(['Daily', 'Weekly', 'Monthly'] as const).map((p) => (
                    <button key={p} onClick={() => setPeriod(p)} className={`rounded px-2 py-0.5 ${period === p ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              }
            >
              <TrendChart data={data.series.map((s) => ({ day: s.day, bookings: s.bookings, value: s.revenue }))} moneyLabel="Revenue (₹)" height={230} />
            </Card>

            <Card title="Booking Status">
              <Donut
                data={bookingStatusDonut(data.bookingsByStatus)}
                centerValue={data.kpis.totalBookings.toLocaleString('en-IN')}
                centerLabel="Total"
              />
            </Card>

            <Card title="Recent Bookings" action={<Link to="/admin/bookings" className="text-xs text-blue-600">View All</Link>}>
              <ul className="space-y-2">
                {data.recentBookings.map((b, i) => (
                  <RecentRow key={b.id} b={b} grad={GRADIENTS[i % GRADIENTS.length]} />
                ))}
                {data.recentBookings.length === 0 && <li className="text-xs text-slate-400">No bookings yet.</li>}
              </ul>
            </Card>
          </div>

          {/* Row 2: top agencies + payment overview + system status */}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
            <Card title="Top Performing Agencies" className="xl:col-span-2" action={<Link to="/reports" className="text-xs text-blue-600">View All</Link>}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase text-slate-400">
                    <th className="pb-1.5">Agency</th>
                    <th className="pb-1.5 text-right">Bookings</th>
                    <th className="pb-1.5 text-right">Revenue</th>
                    <th className="pb-1.5 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topAgencies.map((a) => (
                    <tr key={a.agencyId} className="border-t border-slate-100">
                      <td className="py-1.5 text-slate-700">{a.agencyName}</td>
                      <td className="py-1.5 text-right text-slate-600">{a.bookings}</td>
                      <td className="py-1.5 text-right font-medium text-slate-900">{inr(a.revenue)}</td>
                      <td className="py-1.5 text-right text-amber-600">{inr(a.outstanding)}</td>
                    </tr>
                  ))}
                  {data.topAgencies.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-xs text-slate-400">No agency revenue yet.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>

            <Card title="Payment Overview">
              <Donut
                data={[
                  { name: 'Paid', value: data.paymentOverview.paid, color: '#22c55e' },
                  { name: 'Pending', value: data.paymentOverview.pending, color: '#f59e0b' },
                  { name: 'Failed', value: data.paymentOverview.failed, color: '#ef4444' },
                  { name: 'Refunded', value: data.paymentOverview.refunded, color: '#cbd5e1' },
                ]}
                centerValue={inr(data.paymentOverview.paid)}
                centerLabel="Paid"
                valueFormat={inr}
              />
            </Card>

            <Card title="System Status">
              <ul className="space-y-2">
                {SYSTEM_STATUS.map((s) => (
                  <li key={s.name} className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${s.status === 'Healthy' ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-xs font-medium text-slate-700">{s.name}</div>
                      <div className="truncate text-[11px] text-slate-400">{s.detail}</div>
                    </div>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${s.status === 'Healthy' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Pending approvals */}
          <Card title="Pending Approvals" action={<Link to="/applications" className="text-xs text-blue-600">View All ({data.approvals.pendingReview + data.approvals.ekycPending})</Link>}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {APPROVALS.map((a) => {
                const Icon = Icons[a.icon];
                return (
                  <div key={a.kind} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon className="h-[18px] w-[18px]" /></span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-xs text-slate-400">{a.kind}</div>
                      <div className="truncate text-sm font-medium text-slate-800">{a.name}</div>
                    </div>
                    <Link to="/applications" className="rounded border border-slate-200 px-2 py-1 text-xs text-blue-600">Review</Link>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

const QUICK_ACTIONS: { label: string; to: string; icon: IconName }[] = [
  { label: 'Add Agency', to: '/admin/agencies', icon: 'agencies' },
  { label: 'Create Offer', to: '/admin/promotions', icon: 'pricing' },
  { label: 'Broadcast Notification', to: '/admin/notifications', icon: 'bell' },
  { label: 'Generate Invoice', to: '/admin/invoices', icon: 'reports' },
];

function QuickActions() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        <Icons.activity className="h-4 w-4" /> Quick Actions
        <Icons.chevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {QUICK_ACTIONS.map((a) => {
            const Icon = Icons[a.icon];
            return (
              <button
                key={a.label}
                onClick={() => {
                  setOpen(false);
                  navigate(a.to);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                  <Icon className="h-4 w-4" />
                </span>
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentRow({ b, grad }: { b: RecentBooking; grad: string }) {
  const ref = `BK-${b.id.slice(0, 8).toUpperCase()}`;
  return (
    <li className="flex items-center gap-2.5">
      <div className={`h-9 w-9 shrink-0 rounded-md bg-gradient-to-br ${grad}`} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-xs font-medium text-slate-800">{ref}</div>
        <div className="truncate text-[11px] text-slate-500">{b.resortName}</div>
        <div className="text-[10px] text-slate-400">{b.guests ?? 2} guests · {b.nights}n</div>
      </div>
      <div className="text-right leading-tight">
        <div className={`text-[11px] font-medium ${STATE_DOT[b.state] ?? 'text-blue-600'}`}>{stateLabel(b.state)}</div>
        <div className="text-xs font-semibold text-slate-900">{inr(b.agencyPrice)}</div>
      </div>
    </li>
  );
}
