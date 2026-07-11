import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../components/layout/AppShell';
import { StatCard, inr } from '../components/dashboard/StatCard';
import { Icons } from '../components/layout/icons';
import { SkeletonStats, SkeletonChart, SkeletonTable } from '../components/ui/Skeleton';
import * as adminApi from '../api/admin.api';
import type { ReportSummary } from '../types/admin';

function toCsv(report: ReportSummary): string {
  const lines: string[] = [];
  lines.push('Revenue by agency');
  lines.push('Agency,Bookings,Revenue,Outstanding');
  for (const r of report.revenueByAgency) {
    lines.push(`"${r.agencyName}",${r.bookings},${r.revenue},${r.outstanding}`);
  }
  lines.push('');
  lines.push('Bookings by resort');
  lines.push('Resort,Bookings,Revenue');
  for (const r of report.bookingsByResort) {
    lines.push(`"${r.resortName}",${r.bookings},${r.revenue}`);
  }
  return lines.join('\n');
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [range, setRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['report', range],
    queryFn: () => adminApi.getReportSummary(range.from || undefined, range.to || undefined),
  });

  return (
    <AppShell title="Reports">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">From</span>
            <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">To</span>
            <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
          </label>
          <button
            disabled={!data}
            onClick={() => data && download('report.csv', toCsv(data))}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <SkeletonStats count={3} />
            <SkeletonChart />
            <SkeletonTable rows={6} />
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Revenue" value={inr(data.totals.revenue)} icon={<Icons.finance />} accent="sky" />
              <StatCard label="Bookings" value={data.totals.bookings.toLocaleString('en-IN')} icon={<Icons.bookings />} accent="blue" />
              <StatCard label="Outstanding" value={inr(data.totals.outstanding)} icon={<Icons.reports />} accent="amber" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ReportTable
                title="Revenue by agency"
                head={['Agency', 'Bookings', 'Revenue', 'Outstanding']}
                rows={data.revenueByAgency.map((r) => [r.agencyName, String(r.bookings), inr(r.revenue), inr(r.outstanding)])}
              />
              <ReportTable
                title="Bookings by resort"
                head={['Resort', 'Bookings', 'Revenue']}
                rows={data.bookingsByResort.map((r) => [r.resortName, String(r.bookings), inr(r.revenue)])}
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function ReportTable({ title, head, rows }: { title: string; head: string[]; rows: string[][] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-slate-400">
            {head.map((h, i) => (
              <th key={h} className={`pb-2 ${i > 0 ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-slate-100">
              {row.map((cell, ci) => (
                <td key={ci} className={`py-2 ${ci > 0 ? 'text-right text-slate-900' : 'text-slate-600'}`}>{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={head.length} className="py-6 text-center text-slate-400">No data in range.</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
