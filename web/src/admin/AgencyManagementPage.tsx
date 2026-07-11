import { type FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Icons } from '../components/layout/icons';
import { SkeletonRows } from '../components/ui/Skeleton';
import * as adminApi from '../api/admin.api';
import type { Agency, CreateAgencyInput } from '../types/admin';
import { formatPaymentTerms } from '../shared/format';

type Tab = 'agencies' | 'pending';

export function AgencyManagementPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'agencies';
  const [showCreate, setShowCreate] = useState(params.get('action') === 'create');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('action') === 'create') setShowCreate(true);
  }, [params]);

  function setTab(t: Tab) {
    setParams(t === 'agencies' ? {} : { tab: t });
  }

  return (
    <AppShell title="Agency Management">
      {showCreate && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-800 text-base">Create New Agency</h3>
            <button
              onClick={() => {
                setShowCreate(false);
                setParams(tab === 'agencies' ? {} : { tab });
              }}
              className="text-sm text-slate-505 hover:text-slate-700 hover:underline"
            >
              ✕ Close section
            </button>
          </div>
          <CreateAgencyForm
            onClose={() => {
              setShowCreate(false);
              setParams(tab === 'agencies' ? {} : { tab });
            }}
            onError={setError}
          />
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm">
          <button onClick={() => setTab('agencies')} className={`rounded-md px-3 py-1.5 ${tab === 'agencies' ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-500'}`}>
            Agencies
          </button>
          <button onClick={() => setTab('pending')} className={`rounded-md px-3 py-1.5 ${tab === 'pending' ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-500'}`}>
            Pending Registrations
          </button>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          <Icons.agencies className="h-4 w-4" /> Create Agency
        </button>
      </div>

      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {tab === 'agencies' ? <AgenciesTab onError={setError} /> : <PendingTab onError={setError} />}
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

function extractError(err: unknown): string {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Action failed';
}

type StatusFilter = 'all' | 'ACTIVE' | 'SUSPENDED';
type TypeFilter = 'all' | 'standard' | 'independent';

function AgenciesTab({ onError }: { onError: (m: string | null) => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['agencies'], queryFn: adminApi.listAgencies });
  const [confirmDelete, setConfirmDelete] = useState<Agency | null>(null);
  const [editingCommercial, setEditingCommercial] = useState<Agency | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['agencies'] });
    queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
  };
  const run = (fn: () => Promise<unknown>) => {
    onError(null);
    fn().then(invalidate).catch((e) => onError(extractError(e)));
  };

  const q = search.trim().toLowerCase();
  const filtered = (data?.items ?? []).filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (typeFilter === 'independent' && !a.isIndependent) return false;
    if (typeFilter === 'standard' && a.isIndependent) return false;
    if (q) {
      const haystack = `${a.legalName} ${a.gstin} ${a.contactEmail} ${a.contactPhone}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  const filtersActive = statusFilter !== 'all' || typeFilter !== 'all' || q.length > 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, GSTIN, email, phone…"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="all">All types</option>
          <option value="standard">Standard</option>
          <option value="independent">Independent</option>
        </select>
        {filtersActive && (
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setTypeFilter('all');
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>

      {!isLoading && (
        <p className="mb-2 text-xs text-slate-400">
          Showing {filtered.length} of {data?.items.length ?? 0} agencies
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
            <th className="px-4 py-2">Agency</th>
            <th className="px-4 py-2">GSTIN</th>
            <th className="px-4 py-2">Contact</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <SkeletonRows rows={6} cols={5} />}
          {filtered.map((a) => (
            <tr key={a.id} className="border-b border-slate-100">
              <td className="px-4 py-2 font-medium text-slate-800">
                <div className="flex items-center gap-2">
                  <Link to={`/admin/agencies/${a.id}`} className="text-blue-700 hover:underline">
                    {a.legalName}
                  </Link>
                  {a.isIndependent && (
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      Independent
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 font-mono text-xs text-slate-500">
                {a.isIndependent ? <span className="text-slate-400 font-sans italic">N/A (Aadhaar Only)</span> : a.gstin}
              </td>
              <td className="px-4 py-2 text-slate-500">{a.contactEmail}</td>
              <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-1.5">
                  <button onClick={() => setEditingCommercial(a)} className="rounded border border-slate-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50">Commercials</button>
                  {a.status === 'ACTIVE' ? (
                    <button onClick={() => run(() => adminApi.suspendAgency(a.id))} className="rounded border border-slate-200 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50">Suspend</button>
                  ) : (
                    <button onClick={() => run(() => adminApi.reactivateAgency(a.id))} className="rounded border border-slate-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50">Activate</button>
                  )}
                  <button onClick={() => setConfirmDelete(a)} className="rounded border border-slate-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50">Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {!isLoading && filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                {data?.items.length ? 'No agencies match your filters.' : 'No agencies yet.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {confirmDelete && (
        <Modal title="Delete agency" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-slate-600">
            Delete <strong>{confirmDelete.legalName}</strong>? This is only allowed if the agency has no bookings,
            invoices, or payments. This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="rounded border border-slate-200 px-3 py-1.5 text-sm">Cancel</button>
            <button
              onClick={() => {
                run(() => adminApi.deleteAgency(confirmDelete.id));
                setConfirmDelete(null);
              }}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}

      {editingCommercial && (
        <ManageCommercialModal
          agency={editingCommercial}
          onClose={() => setEditingCommercial(null)}
          onError={onError}
        />
      )}
    </div>
  );
}

function PendingTab({ onError }: { onError: (m: string | null) => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['applications', 'REVIEW'], queryFn: () => adminApi.listApplications('REVIEW') });
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['applications'] });
    queryClient.invalidateQueries({ queryKey: ['agencies'] });
    queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
  };
  const run = (fn: () => Promise<unknown>) => {
    onError(null);
    fn().then(invalidate).catch((e) => onError(extractError(e)));
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
            <th className="px-4 py-2">Agency</th>
            <th className="px-4 py-2">GSTIN</th>
            <th className="px-4 py-2">Submitted</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <SkeletonRows rows={5} cols={4} />}
          {data?.items.map((app) => (
            <tr key={app.id} className="border-b border-slate-100">
              <td className="px-4 py-2 font-medium text-slate-800">
                <div className="flex items-center gap-2">
                  <span>{app.legalName ?? '—'}</span>
                  {app.isIndependent && (
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      Independent
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 font-mono text-xs text-slate-500">
                {app.isIndependent ? <span className="text-slate-400 font-sans italic">N/A (Aadhaar Only)</span> : (app.gstin ?? '—')}
              </td>
              <td className="px-4 py-2 text-slate-500">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}</td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-1.5">
                  <Link to={`/admin/applications/${app.id}`} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Open</Link>
                  <button onClick={() => run(() => adminApi.approve(app.id))} className="rounded border border-slate-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50">Approve</button>
                  <button onClick={() => { setRejectId(app.id); setReason(''); }} className="rounded border border-slate-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50">Reject</button>
                </div>
              </td>
            </tr>
          ))}
          {data?.items.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No pending registrations.</td></tr>}
        </tbody>
      </table>

      {rejectId && (
        <Modal title="Reject registration" onClose={() => setRejectId(null)}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (required)"
            rows={3}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setRejectId(null)} className="rounded border border-slate-200 px-3 py-1.5 text-sm">Cancel</button>
            <button
              disabled={reason.trim().length < 3}
              onClick={() => {
                run(() => adminApi.reject(rejectId, reason.trim()));
                setRejectId(null);
              }}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const EMPTY: CreateAgencyInput = { legalName: '', gstin: '', pan: '', contactEmail: '', contactPhone: '', tier: 'A', isIndependent: false };

function CreateAgencyForm({ onClose, onError }: { onClose: () => void; onError: (m: string | null) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateAgencyInput>(EMPTY);
  const [isIndependent, setIsIndependent] = useState(false);
  const [registrationProof, setRegistrationProof] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const { data: tiers } = useQuery({ queryKey: ['tiers'], queryFn: adminApi.listTiers });

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('legalName', form.legalName);
      if (!isIndependent && form.gstin) {
        fd.append('gstin', form.gstin);
      }
      fd.append('pan', form.pan);
      fd.append('contactEmail', form.contactEmail);
      fd.append('contactPhone', form.contactPhone);
      fd.append('tier', form.tier);
      fd.append('isIndependent', String(isIndependent));
      if (registrationProof) {
        fd.append('registrationProof', registrationProof);
      }
      if (addressProof) {
        fd.append('addressProof', addressProof);
      }
      return adminApi.createAgency(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
      onClose();
    },
    onError: (e) => onError(extractError(e)),
  });

  const fields: { key: Exclude<keyof CreateAgencyInput, 'tier' | 'isIndependent'>; label: string; placeholder?: string }[] = [
    { key: 'legalName', label: 'Legal name' },
    ...(!isIndependent ? [{ key: 'gstin' as const, label: 'GSTIN', placeholder: '27AABCU9603R1ZM' }] : []),
    { key: 'pan', label: 'PAN', placeholder: 'AABCU9603R' },
    { key: 'contactEmail', label: 'Contact email' },
    { key: 'contactPhone', label: 'Contact phone', placeholder: '9876543210' },
  ];

  function submit(e: FormEvent) {
    e.preventDefault();
    onError(null);
    mutation.mutate();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="col-span-full flex items-center gap-2.5 mb-2 text-sm font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isIndependent}
            onChange={(e) => setIsIndependent(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
          />
          <span>Register as an Independent Agent (Aadhaar verification only, no GST required)</span>
        </label>

        {fields.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">{f.label}</span>
            <input
              value={form[f.key] ?? ''}
              placeholder={f.placeholder}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              required
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
        ))}
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Commercial Tier</span>
          <select
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2"
            required
          >
            {tiers && Object.keys(tiers).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            {!tiers && <option value="A">A</option>}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 font-semibold">GST Registration Proof</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setRegistrationProof(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 font-semibold">Address Proof</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setAddressProof(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button type="button" onClick={onClose} className="rounded border border-slate-200 px-3 py-1.5 text-sm bg-white">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700">
          {mutation.isPending ? 'Creating…' : 'Create agency'}
        </button>
      </div>
    </form>
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

function ManageCommercialModal({
  agency,
  onClose,
  onError,
}: {
  agency: Agency;
  onClose: () => void;
  onError: (m: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const { data: tiers } = useQuery({ queryKey: ['tiers'], queryFn: adminApi.listTiers });

  const { data: detail, isLoading } = useQuery({
    queryKey: ['agency', agency.id],
    queryFn: () => adminApi.getAgencyById(agency.id),
  });

  const [selectedTier, setSelectedTier] = useState('A');

  useEffect(() => {
    if (detail?.commercialConfigurations?.[0]) {
      setSelectedTier(detail.commercialConfigurations[0].tier);
    }
  }, [detail]);

  const mutation = useMutation({
    mutationFn: () => adminApi.updateAgencyCommercialConfig(agency.id, selectedTier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      onClose();
    },
    onError: (e) => onError(extractError(e)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    onError(null);
    mutation.mutate();
  }

  const currentTier = detail?.commercialConfigurations?.[0];

  return (
    <Modal title="Manage Agency Commercials" onClose={onClose}>
      {isLoading ? (
        <p className="text-sm text-slate-500 py-4 text-center">Loading configurations...</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agency</p>
            <p className="text-sm font-medium text-slate-800">{agency.legalName}</p>
          </div>

          {currentTier && (
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-700 text-sm mb-1.5 border-b border-slate-200/60 pb-1">Current Configuration</p>
              <p className="flex justify-between"><span>Tier:</span> <span className="font-semibold text-slate-800">{currentTier.tier}</span></p>
              <p className="flex justify-between"><span>Payment Mode:</span> <span className="font-semibold text-slate-800">{currentTier.paymentMode}</span></p>
              <p className="flex justify-between"><span>Credit Limit:</span> <span className="font-semibold text-slate-800">₹{Number(currentTier.creditLimit).toLocaleString()}</span></p>
              <p className="flex justify-between"><span>Payment Terms:</span> <span className="font-semibold text-slate-800">{formatPaymentTerms(currentTier.paymentTerms)}</span></p>
              <p className="flex justify-between"><span>Markup:</span> <span className="font-semibold text-slate-800">{currentTier.markupPct}%</span></p>
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Select New Tier</span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2"
              required
            >
              {tiers && Object.keys(tiers).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              {!tiers && <option value="A">A</option>}
            </select>
          </label>

          <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 mt-4">
            <button type="button" onClick={onClose} className="rounded border border-slate-200 px-3 py-1.5 text-sm">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              {mutation.isPending ? 'Updating…' : 'Update Commercials'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
