import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BookingState } from '../../types/booking';
import type { StatusCount } from '../../types/dashboard';

const AXIS = '#94a3b8';
const GRID = '#eef2f7';

function shortDay(day: string): string {
  return new Date(day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

interface SeriesPoint {
  day: string;
  bookings: number;
  value: number;
}

/** Dual-line chart: bookings (count) + a money series (revenue or spend). */
export function TrendChart({ data, moneyLabel, height = 260 }: { data: SeriesPoint[]; moneyLabel: string; height?: number }) {
  const chartData = data.map((d) => ({ ...d, label: shortDay(d.day) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} width={36} />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke={AXIS}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
        />
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="bookings" name="Bookings" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
        <Line yAxisId="right" type="monotone" dataKey="value" name={moneyLabel} stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Generic donut with a legend showing value + share %. */
export function Donut({
  data,
  centerValue,
  centerLabel,
  valueFormat,
}: {
  data: { name: string; value: number; color: string }[];
  centerValue: string;
  centerLabel?: string;
  valueFormat?: (n: number) => string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const fmt = valueFormat ?? ((n: number) => String(n));
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-base font-semibold leading-none text-slate-900">{centerValue}</span>
          {centerLabel && <span className="mt-0.5 text-[10px] text-slate-400">{centerLabel}</span>}
        </div>
      </div>
      <ul className="flex-1 space-y-1 text-xs">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            <span className="text-slate-600">{d.name}</span>
            <span className="ml-auto font-medium text-slate-800">{fmt(d.value)}</span>
            <span className="w-9 text-right text-slate-400">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATE_COLOR: Record<BookingState, string> = {
  COMMITTED: '#22c55e',
  CONFIRMED_ON_CREDIT: '#3b82f6',
  CONFIRMED: '#3b82f6',
  PAID: '#3b82f6',
  AWAITING_PAYMENT: '#f59e0b',
  DRAFT: '#cbd5e1',
  CANCELLED: '#ef4444',
  EXPIRED: '#a855f7',
};

export function StatusDonut({ data }: { data: StatusCount[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map((d) => ({ name: d.state, value: d.count }));
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={2}>
              {chartData.map((d) => (
                <Cell key={d.name} fill={STATE_COLOR[d.name as BookingState] ?? '#cbd5e1'} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-slate-900">{total}</span>
          <span className="text-xs text-slate-400">Total</span>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.state} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATE_COLOR[d.state] ?? '#cbd5e1' }} />
              {d.state}
            </span>
            <span className="font-medium text-slate-900">{d.count}</span>
          </li>
        ))}
        {data.length === 0 && <li className="text-slate-400">No bookings yet.</li>}
      </ul>
    </div>
  );
}
