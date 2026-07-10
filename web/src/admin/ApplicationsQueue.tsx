import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SkeletonTable } from '../components/ui/Skeleton';
import * as adminApi from '../api/admin.api';
import type { LifecycleState } from '../types/onboarding';

const STATES: (LifecycleState | 'ALL')[] = [
  'ALL',
  'VERIFICATION',
  'REVIEW',
  'APPROVED',
  'COMMERCIAL_CONFIGURATION',
  'ACTIVE',
  'REJECTED',
  'SUSPENDED',
];

export function ApplicationsQueue() {
  const [state, setState] = useState<LifecycleState | 'ALL'>('REVIEW');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', state],
    queryFn: () => adminApi.listApplications(state === 'ALL' ? undefined : state),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {STATES.map((s) => (
          <button
            key={s}
            onClick={() => setState(s)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              state === s ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && <SkeletonTable rows={6} cols={5} />}
      {isError && <p className="text-sm text-red-600">Failed to load applications.</p>}

      {data && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2">Legal name</th>
              <th className="py-2">GSTIN</th>
              <th className="py-2">State</th>
              <th className="py-2">Submitted</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {data.items.map((app) => (
              <tr key={app.id} className="border-b border-slate-100">
                <td className="py-2">{app.legalName ?? '—'}</td>
                <td className="py-2 text-slate-500">{app.gstin ?? '—'}</td>
                <td className="py-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{app.lifecycleState}</span>
                </td>
                <td className="py-2 text-slate-500">
                  {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}
                </td>
                <td className="py-2 text-right">
                  <Link to={`/admin/applications/${app.id}`} className="text-slate-900 underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No applications in this state.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
