import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, PageHeader, type Tone } from '../../components/ui/kit';
import { SkeletonCardGrid } from '../../components/ui/Skeleton';
import * as securityApi from '../../api/security.api';
import type { Integration } from '../../api/security.api';

const CATEGORY_ORDER = ['Payments', 'Messaging', 'Verification', 'Inventory', 'Finance'];

function IntegrationCard({ i }: { i: Integration }) {
  const statusTone: Tone = i.live ? 'green' : i.configured ? 'amber' : 'slate';
  const statusLabel = i.live ? 'Live' : i.configured ? 'Configured' : 'Disabled';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-800">{i.name}</div>
          <div className="text-xs capitalize text-slate-400">Provider · {i.provider}</div>
        </div>
        <Badge tone={statusTone}>{statusLabel}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs">
        <span className="flex items-center gap-1.5 text-slate-500">
          <span className={`h-2 w-2 rounded-full ${i.live ? 'bg-green-500' : 'bg-slate-300'}`} />
          {i.live ? 'Live mode' : 'Test / off'}
        </span>
        <span className="flex items-center gap-1.5 text-slate-500">
          <span className={`h-2 w-2 rounded-full ${i.configured ? 'bg-green-500' : 'bg-amber-500'}`} />
          {i.configured ? 'Credentials set' : 'Needs credentials'}
        </span>
      </div>
    </div>
  );
}

export function IntegrationsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['security', 'integrations'], queryFn: securityApi.getIntegrations });

  const grouped = (data ?? []).reduce<Record<string, Integration[]>>((acc, i) => {
    (acc[i.category] ??= []).push(i);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));

  return (
    <AppShell>
      <PageHeader title="Integrations" subtitle="Live status of the third-party services this platform connects to, derived from runtime configuration." />

      {isLoading ? (
        <SkeletonCardGrid count={6} />
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat}>
              <div className="mb-2 text-sm font-semibold text-slate-700">{cat}</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {grouped[cat].map((i) => (
                  <IntegrationCard key={i.key} i={i} />
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-400">
            To change a provider or switch to live mode, update the deployment environment configuration — these values are read-only from the portal.
          </p>
        </div>
      )}
    </AppShell>
  );
}
