import { useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Field, Modal, PageHeader, SearchInput, Select, Stat, Toolbar, type Column, type Tone } from '../../components/ui/kit';
import { TICKETS, type MockTicket, type TicketStatus } from '../mock';

const STATUS_TONE: Record<TicketStatus, Tone> = { Open: 'red', Pending: 'amber', Resolved: 'green', Closed: 'slate' };
const PRIORITY_TONE: Record<MockTicket['priority'], Tone> = { High: 'red', Medium: 'amber', Low: 'slate' };
const NEXT: Record<TicketStatus, TicketStatus> = { Open: 'Pending', Pending: 'Resolved', Resolved: 'Closed', Closed: 'Closed' };

export function SupportPage() {
  const [tickets, setTickets] = useState<MockTicket[]>(TICKETS);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<MockTicket | null>(null);

  const rows = useMemo(
    () =>
      tickets.filter(
        (t) => (status === 'all' || t.status.toLowerCase() === status) && [t.id, t.subject, t.agency].some((f) => f.toLowerCase().includes(q.toLowerCase())),
      ),
    [tickets, q, status],
  );

  const advance = (id: string) => setTickets((p) => p.map((t) => (t.id === id ? { ...t, status: NEXT[t.status] } : t)));

  const columns: Column<MockTicket>[] = [
    { header: 'Ticket', className: 'font-mono text-xs text-slate-600', render: (t) => t.id },
    { header: 'Subject', className: 'font-medium text-slate-800', render: (t) => t.subject },
    { header: 'Agency', render: (t) => t.agency },
    { header: 'Priority', render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge> },
    { header: 'Status', render: (t) => <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge> },
    { header: 'Updated', render: (t) => <span className="text-slate-500">{t.updated}</span> },
    { header: 'Actions', align: 'right', render: (t) => <Button variant="ghost" onClick={() => setSelected(t)}>Open</Button> },
  ];

  return (
    <AppShell>
      <PageHeader title="Support" subtitle="Agency support tickets — respond, add internal notes and manage status." />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open" value={tickets.filter((t) => t.status === 'Open').length} tone="red" />
        <Stat label="Pending" value={tickets.filter((t) => t.status === 'Pending').length} tone="amber" />
        <Stat label="Resolved" value={tickets.filter((t) => t.status === 'Resolved').length} tone="green" />
        <Stat label="High priority" value={tickets.filter((t) => t.priority === 'High').length} tone="violet" />
      </div>

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search tickets…" />
        <Select
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'open', label: 'Open' },
            { value: 'pending', label: 'Pending' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'closed', label: 'Closed' },
          ]}
        />
      </Toolbar>

      <DataTable columns={columns} rows={rows} rowKey={(t) => t.id} empty="No tickets match your filters." />

      {selected && (
        <Modal
          title={`${selected.id} · ${selected.subject}`}
          onClose={() => setSelected(null)}
          wide
          footer={
            <>
              <Button onClick={() => setSelected(null)}>Close</Button>
              {selected.status !== 'Closed' && (
                <Button variant="primary" onClick={() => { advance(selected.id); setSelected(null); }}>
                  Mark {NEXT[selected.status]}
                </Button>
              )}
            </>
          }
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={PRIORITY_TONE[selected.priority]}>{selected.priority} priority</Badge>
            <Badge tone={STATUS_TONE[selected.status]}>{selected.status}</Badge>
            <span className="text-slate-400">from {selected.agency}</span>
          </div>
          <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
            <p>Hi team, {selected.subject.toLowerCase()}. Could you please look into this at the earliest?</p>
            <p className="text-xs text-slate-400">— {selected.agency}, {selected.updated}</p>
          </div>
          <div className="mt-3 space-y-2">
            <Field label="Reply to agency">
              <textarea rows={3} placeholder="Type your response…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400" />
            </Field>
            <Field label="Internal note (not visible to agency)">
              <textarea rows={2} placeholder="Add a private note…" className="w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400" />
            </Field>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
