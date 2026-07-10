import { type FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Icons } from '../components/layout/icons';
import { SkeletonRows } from '../components/ui/Skeleton';
import * as adminApi from '../api/admin.api';
import type { Agency, CreateAgencyInput } from '../types/admin';

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

      {showCreate && (
        <CreateAgencyModal
          onClose={() => {
            setShowCreate(false);
            setParams(tab === 'agencies' ? {} : { tab });
          }}
          onError={setError}
        />
      )}
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

function AgenciesTab({ onError }: { onError: (m: string | null) => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['agencies'], queryFn: adminApi.listAgencies });
  const [confirmDelete, setConfirmDelete] = useState<Agency | null>(null);

  const invalidate = () => {
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
            <th className="px-4 py-2">Contact</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <SkeletonRows rows={6} cols={5} />}
          {data?.items.map((a) => (
            <tr key={a.id} className="border-b border-slate-100">
              <td className="px-4 py-2 font-medium text-slate-800">{a.legalName}</td>
              <td className="px-4 py-2 font-mono text-xs text-slate-500">{a.gstin}</td>
              <td className="px-4 py-2 text-slate-500">{a.contactEmail}</td>
              <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-1.5">
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
          {data?.items.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No agencies yet.</td></tr>}
        </tbody>
      </table>

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
              <td className="px-4 py-2 font-medium text-slate-800">{app.legalName ?? '—'}</td>
              <td className="px-4 py-2 font-mono text-xs text-slate-500">{app.gstin ?? '—'}</td>
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

const EMPTY: CreateAgencyInput = { legalName: '', gstin: '', pan: '', contactEmail: '', contactPhone: '' };

function CreateAgencyModal({ onClose, onError }: { onClose: () => void; onError: (m: string | null) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateAgencyInput>(EMPTY);
  const mutation = useMutation({
    mutationFn: () => adminApi.createAgency(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
      onClose();
    },
    onError: (e) => onError(extractError(e)),
  });

  const fields: { key: keyof CreateAgencyInput; label: string; placeholder?: string }[] = [
    { key: 'legalName', label: 'Legal name' },
    { key: 'gstin', label: 'GSTIN', placeholder: '27AABCU9603R1ZM' },
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
    <Modal title="Create agency" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {fields.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">{f.label}</span>
            <input
              value={form[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              required
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
        ))}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded border border-slate-200 px-3 py-1.5 text-sm">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {mutation.isPending ? 'Creating…' : 'Create agency'}
          </button>
        </div>
      </form>
    </Modal>
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
