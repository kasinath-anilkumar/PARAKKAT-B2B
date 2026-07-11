import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Field, Input, Modal, Select, type Tone } from '../components/ui/kit';
import * as supportApi from '../api/support.api';
import type { SupportPriority, SupportStatus } from '../api/support.api';

export const STATUS_TONE: Record<SupportStatus, Tone> = { OPEN: 'red', PENDING: 'amber', RESOLVED: 'green', CLOSED: 'slate' };
export const PRIORITY_TONE: Record<SupportPriority, Tone> = { HIGH: 'red', MEDIUM: 'amber', LOW: 'slate' };
const fmt = (d: string) => new Date(d).toLocaleString('en-IN');

function invalidateSupport(qc: ReturnType<typeof useQueryClient>, id?: string) {
  if (id) qc.invalidateQueries({ queryKey: ['support', id] });
  qc.invalidateQueries({ queryKey: ['support', 'all'] });
  qc.invalidateQueries({ queryKey: ['support', 'mine'] });
}

/** Ticket thread modal — admins get status controls + internal notes. */
export function TicketModal({ id, isAdmin, onClose }: { id: string; isAdmin?: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const { data: ticket, isLoading } = useQuery({ queryKey: ['support', id], queryFn: () => supportApi.getTicket(id) });

  const replyM = useMutation({
    mutationFn: () => supportApi.replyTicket(id, reply, isAdmin ? internal : undefined),
    onSuccess: () => { setReply(''); setInternal(false); invalidateSupport(qc, id); },
  });
  const statusM = useMutation({ mutationFn: (s: SupportStatus) => supportApi.setTicketStatus(id, s), onSuccess: () => invalidateSupport(qc, id) });

  return (
    <Modal title={ticket ? ticket.subject : 'Ticket'} onClose={onClose} wide footer={<Button onClick={onClose}>Close</Button>}>
      {isLoading || !ticket ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={PRIORITY_TONE[ticket.priority]}>{ticket.priority} priority</Badge>
            <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status}</Badge>
            {ticket.category && <span className="text-slate-400">· {ticket.category}</span>}
            {isAdmin && <span className="text-slate-400">· {ticket.agencyName}</span>}
          </div>

          {isAdmin && ticket.status !== 'CLOSED' && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(['PENDING', 'RESOLVED', 'CLOSED'] as SupportStatus[]).map((s) => (
                <Button key={s} variant="secondary" disabled={statusM.isPending || ticket.status === s} onClick={() => statusM.mutate(s)}>
                  Mark {s.charAt(0) + s.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          )}

          <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3">
            {ticket.messages.map((m) => (
              <div key={m.id} className={`rounded-lg p-2.5 text-sm ${m.internal ? 'border border-amber-200 bg-amber-50/60' : 'border border-slate-100 bg-white'}`}>
                <div className="mb-0.5 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-600">{m.author} · {m.authorRole}{m.internal ? ' · internal note' : ''}</span>
                  <span>{fmt(m.createdAt)}</span>
                </div>
                <div className="whitespace-pre-wrap text-slate-700">{m.body}</div>
              </div>
            ))}
          </div>

          {ticket.status !== 'CLOSED' && (
            <div className="mt-3 space-y-2">
              <Field label={isAdmin ? 'Reply to agency' : 'Add a reply'}>
                <textarea
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your message…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                />
              </Field>
              {isAdmin && (
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                  Internal note (not visible to the agency)
                </label>
              )}
              <div className="flex justify-end">
                <Button variant="primary" disabled={replyM.isPending || !reply.trim()} onClick={() => replyM.mutate()}>
                  {replyM.isPending ? 'Sending…' : internal ? 'Add note' : 'Send reply'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

/** Raise-ticket form (AGENCY/AGENT). */
export function RaiseTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<SupportPriority>('MEDIUM');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => supportApi.createTicket({ subject, category: category || undefined, priority, body }),
    onSuccess: (t) => { invalidateSupport(qc); onCreated(t.id); },
    onError: (e) => setError((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Could not raise ticket'),
  });

  return (
    <Modal
      title="Raise Support Ticket"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={create.isPending || subject.trim().length < 3 || !body.trim()} onClick={() => { setError(null); create.mutate(); }}>
            {create.isPending ? 'Submitting…' : 'Submit ticket'}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="space-y-3">
        <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of your issue" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select
              value={category}
              onChange={setCategory}
              options={[
                { value: '', label: 'General' },
                { value: 'Bookings', label: 'Bookings' },
                { value: 'Payments', label: 'Payments' },
                { value: 'Account', label: 'Account' },
                { value: 'Technical', label: 'Technical' },
              ]}
            />
          </Field>
          <Field label="Priority">
            <Select
              value={priority}
              onChange={(v) => setPriority(v as SupportPriority)}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
              ]}
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe your issue…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400" />
        </Field>
      </div>
    </Modal>
  );
}
