import { type FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Skeleton, SkeletonForm, SkeletonStats } from '../components/ui/Skeleton';
import * as adminApi from '../api/admin.api';
import type { AgencyDetail, UpdateAgencyInput } from '../types/admin';
import { formatPaymentTerms } from '../shared/format';

function extractError(err: unknown): string {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Action failed';
}

function money(n: number): string {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE' || status === 'PASSED' || status === 'PAID'
      ? 'bg-green-100 text-green-700'
      : status === 'SUSPENDED' || status === 'FAILED' || status === 'VOID'
        ? 'bg-red-100 text-red-700'
        : 'bg-slate-100 text-slate-600';
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

export function AgencyDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: agency, isLoading } = useQuery({
    queryKey: ['agency-detail', id],
    queryFn: () => adminApi.getAgencyDetail(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['agency-detail', id] });
    queryClient.invalidateQueries({ queryKey: ['agencies'] });
    queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
  };

  const statusMutation = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: invalidate,
    onError: (e) => setError(extractError(e)),
  });

  if (isLoading || !agency) {
    return (
      <AppShell title="Agency">
        <div className="space-y-4">
          <Skeleton className="h-7 w-64" />
          <SkeletonStats count={4} />
          <SkeletonForm sections={2} fields={4} />
        </div>
      </AppShell>
    );
  }

  const runStatus = (fn: () => Promise<unknown>) => {
    setError(null);
    statusMutation.mutate(fn);
  };

  return (
    <AppShell title="Agency Detail">
      <Link to="/admin/agencies" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
        ← Back to agencies
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{agency.legalName}</h1>
          <StatusBadge status={agency.status} />
          {agency.isIndependent && (
            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Independent
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {agency.status === 'ACTIVE' ? (
            <button
              disabled={statusMutation.isPending}
              onClick={() => runStatus(() => adminApi.suspendAgency(agency.id))}
              className="rounded border border-slate-200 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              Suspend
            </button>
          ) : (
            <button
              disabled={statusMutation.isPending}
              onClick={() => runStatus(() => adminApi.reactivateAgency(agency.id))}
              className="rounded border border-slate-200 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              Reactivate
            </button>
          )}
          <button
            disabled={statusMutation.isPending}
            onClick={() => setConfirmDelete(true)}
            className="rounded border border-slate-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Financial roll-up */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bookings" value={String(agency.stats.bookings)} />
        <StatCard label="Invoiced" value={money(agency.stats.invoiced)} />
        <StatCard label="Paid" value={money(agency.stats.paid)} />
        <StatCard label="Outstanding" value={money(agency.stats.outstanding)} accent="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ProfileSection agency={agency} onError={setError} onSaved={invalidate} />
        <CommercialSection agency={agency} onError={setError} onSaved={invalidate} />
        <UsersSection agency={agency} />
        <DocumentsSection agency={agency} />
      </div>

      {confirmDelete && (
        <Modal title="Delete agency" onClose={() => setConfirmDelete(false)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Delete <strong>{agency.legalName}</strong>? This is only allowed if the agency has no bookings,
            invoices, or payments. This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(false)} className="rounded border border-slate-200 px-3 py-1.5 text-sm">
              Cancel
            </button>
            <button
              onClick={() => {
                setError(null);
                setConfirmDelete(false);
                adminApi
                  .deleteAgency(agency.id)
                  .then(() => {
                    queryClient.invalidateQueries({ queryKey: ['agencies'] });
                    queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
                    navigate('/admin/agencies');
                  })
                  .catch((e) => setError(extractError(e)));
              }}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: 'amber' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accent === 'amber' ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value ?? '—'}</span>
    </div>
  );
}

function ProfileSection({
  agency,
  onError,
  onSaved,
}: {
  agency: AgencyDetail;
  onError: (m: string | null) => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateAgencyInput>({});

  useEffect(() => {
    setForm({
      legalName: agency.legalName,
      gstin: agency.gstin,
      pan: agency.pan,
      contactEmail: agency.contactEmail,
      contactPhone: agency.contactPhone,
    });
  }, [agency]);

  const mutation = useMutation({
    mutationFn: () => adminApi.updateAgency(agency.id, form),
    onSuccess: () => {
      onSaved();
      setEditing(false);
    },
    onError: (e) => onError(extractError(e)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    onError(null);
    mutation.mutate();
  }

  const fields: { key: keyof UpdateAgencyInput; label: string; hide?: boolean }[] = [
    { key: 'legalName', label: 'Legal name' },
    { key: 'gstin', label: 'GSTIN', hide: agency.isIndependent },
    { key: 'pan', label: 'PAN' },
    { key: 'contactEmail', label: 'Contact email' },
    { key: 'contactPhone', label: 'Contact phone' },
  ];

  return (
    <Card
      title="Profile"
      action={
        !editing ? (
          <button onClick={() => setEditing(true)} className="text-xs font-medium text-blue-700 hover:underline">
            Edit
          </button>
        ) : (
          <button
            onClick={() => {
              setEditing(false);
              onError(null);
            }}
            className="text-xs text-slate-500 hover:underline"
          >
            Cancel
          </button>
        )
      }
    >
      {!editing ? (
        <div>
          <Row label="Business type" value={agency.isIndependent ? 'Independent Agent' : 'Standard Agency'} />
          <Row label="Legal name" value={agency.legalName} />
          {!agency.isIndependent && <Row label="GSTIN" value={<span className="font-mono text-xs">{agency.gstin}</span>} />}
          <Row label="PAN" value={<span className="font-mono text-xs">{agency.pan}</span>} />
          <Row label="Contact email" value={agency.contactEmail} />
          <Row label="Contact phone" value={agency.contactPhone} />
          <Row label="Activated" value={agency.activatedAt ? new Date(agency.activatedAt).toLocaleDateString() : '—'} />
          <Row label="Created" value={new Date(agency.createdAt).toLocaleDateString()} />
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {fields
            .filter((f) => !f.hide)
            .map((f) => (
              <label key={f.key} className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">{f.label}</span>
                <input
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </label>
            ))}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

function CommercialSection({
  agency,
  onError,
  onSaved,
}: {
  agency: AgencyDetail;
  onError: (m: string | null) => void;
  onSaved: () => void;
}) {
  const config = agency.commercialConfigurations?.[0];
  const { data: tiers } = useQuery({ queryKey: ['tiers'], queryFn: adminApi.listTiers });
  const [tier, setTier] = useState(config?.tier ?? 'A');
  const [markup, setMarkup] = useState(String(config?.markupPct ?? ''));

  useEffect(() => {
    if (config?.tier) setTier(config.tier);
    if (config?.markupPct != null) setMarkup(String(config.markupPct));
  }, [config]);

  const tierDefaultMarkup = tiers?.[tier]?.markupPct;
  const numericMarkup = Number(markup);
  const markupInvalid = markup === '' || !Number.isFinite(numericMarkup) || numericMarkup < 0 || numericMarkup > 100;
  const isOverride = tierDefaultMarkup != null && Number.isFinite(numericMarkup) && numericMarkup !== tierDefaultMarkup;

  // Switching tier pre-fills the new tier's default markup (still editable).
  function changeTier(t: string) {
    setTier(t);
    const def = tiers?.[t]?.markupPct;
    if (def != null) setMarkup(String(def));
  }

  const mutation = useMutation({
    mutationFn: () => adminApi.updateAgencyCommercialConfig(agency.id, tier, Math.round(numericMarkup * 100) / 100),
    onSuccess: onSaved,
    onError: (e) => onError(extractError(e)),
  });

  return (
    <Card title="Commercial terms">
      {config ? (
        <div className="mb-4">
          <Row label="Tier" value={config.tier} />
          <Row label="Payment mode" value={config.paymentMode} />
          <Row label="Credit limit" value={money(Number(config.creditLimit))} />
          <Row label="Payment terms" value={formatPaymentTerms(config.paymentTerms)} />
          <Row label="Markup" value={`${config.markupPct}%`} />
        </div>
      ) : (
        <p className="mb-4 text-sm text-slate-400">No commercial configuration.</p>
      )}
      <div className="space-y-3 border-t border-slate-100 pt-3">
        <div className="flex items-end gap-2">
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-slate-700">Tier</span>
            <select
              value={tier}
              onChange={(e) => changeTier(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2"
            >
              {tiers ? (
                Object.keys(tiers).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))
              ) : (
                <option value="A">A</option>
              )}
            </select>
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-slate-700">Markup %</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2"
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            {tierDefaultMarkup != null &&
              (isOverride ? `Overriding tier ${tier} default of ${tierDefaultMarkup}%` : `Tier ${tier} default (${tierDefaultMarkup}%)`)}
          </span>
          <button
            disabled={mutation.isPending || markupInvalid}
            onClick={() => {
              onError(null);
              mutation.mutate();
            }}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {mutation.isPending ? 'Updating…' : 'Update'}
          </button>
        </div>
      </div>
    </Card>
  );
}

function UsersSection({ agency }: { agency: AgencyDetail }) {
  return (
    <Card title={`Users (${agency.users.length})`}>
      {agency.users.length === 0 ? (
        <p className="text-sm text-slate-400">No users linked to this agency.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {agency.users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">{u.name ?? u.email}</p>
                <p className="truncate text-xs text-slate-400">{u.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {u.role}
                </span>
                <StatusBadge status={u.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DocumentsSection({ agency }: { agency: AgencyDetail }) {
  return (
    <Card title={`Documents (${agency.documents.length})`}>
      {agency.documents.length === 0 ? (
        <p className="text-sm text-slate-400">No documents on file.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {agency.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate text-slate-800">{d.fileName ?? d.docType}</p>
                <p className="text-xs text-slate-400">
                  {d.docType} · {new Date(d.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={d.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>
        {children}
      </div>
    </div>
  );
}
