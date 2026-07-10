import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AppShell } from '../components/layout/AppShell';
import { SkeletonRows } from '../components/ui/Skeleton';
import * as adminApi from '../api/admin.api';
import type { AuditLogEntry } from '../types/admin';

const ROLES = ['', 'ADMIN', 'VERIFIER', 'AGENCY', 'AGENT', 'APPLICANT', 'SYSTEM', 'DIGIO'];

export function AuditLogPage() {
  const [filters, setFilters] = useState<adminApi.AuditFilters>({ page: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => adminApi.getAuditLogs(filters),
    placeholderData: keepPreviousData,
  });

  function set(key: keyof adminApi.AuditFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value || undefined, page: 1 }));
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <AppShell title="Activity Logs">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <input
            placeholder="Event contains…"
            onChange={(e) => set('event', e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Entity type"
            onChange={(e) => set('entityType', e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Correlation ID"
            onChange={(e) => set('correlationId', e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <select onChange={(e) => set('actorRole', e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r || 'Any actor'}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Entity</th>
                <th className="px-4 py-2">Actor</th>
                <th className="px-4 py-2">Correlation</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <SkeletonRows rows={8} cols={5} />}
              {data?.items.map((e: AuditLogEntry) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">{e.event}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {e.entityType}
                    <span className="ml-1 font-mono text-xs text-slate-400">{e.entityId.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{e.actorRole}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-400">{e.correlationId?.slice(0, 8) ?? '—'}</td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No matching events.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{data.total} events</span>
            <div className="flex items-center gap-2">
              <button
                disabled={(filters.page ?? 1) <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <span>
                Page {filters.page ?? 1} / {totalPages}
              </span>
              <button
                disabled={(filters.page ?? 1) >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
