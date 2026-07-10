import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Field, Input, Modal, PageHeader, Select, Tabs, type Column, type Tone } from '../../components/ui/kit';
import { AGENCY_TICKETS, FAQS, type AgencyTicket, type TicketState } from '../mock';

const STATUS_TONE: Record<TicketState, Tone> = { Open: 'red', Pending: 'amber', Resolved: 'green', Closed: 'slate' };
const PRIORITY_TONE: Record<AgencyTicket['priority'], Tone> = { High: 'red', Medium: 'amber', Low: 'slate' };

export function AgencySupportPage() {
  const [tab, setTab] = useState('tickets');
  const [tickets, setTickets] = useState<AgencyTicket[]>(AGENCY_TICKETS);
  const [raising, setRaising] = useState(false);
  const [selected, setSelected] = useState<AgencyTicket | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const columns: Column<AgencyTicket>[] = [
    { header: 'Ticket', className: 'font-mono text-xs text-slate-600', render: (t) => t.id },
    { header: 'Subject', className: 'font-medium text-slate-800', render: (t) => t.subject },
    { header: 'Priority', render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge> },
    { header: 'Status', render: (t) => <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge> },
    { header: 'Updated', render: (t) => <span className="text-slate-500">{t.updated}</span> },
    { header: 'Actions', align: 'right', render: (t) => <Button variant="ghost" onClick={() => setSelected(t)}>Open</Button> },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Support"
        subtitle="Raise tickets, track their status and browse FAQs."
        actions={<Button variant="primary" onClick={() => setRaising(true)}>+ Raise Ticket</Button>}
      />

      <Tabs
        tabs={[
          { key: 'tickets', label: 'My Tickets', count: tickets.length },
          { key: 'faqs', label: 'FAQs', count: FAQS.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'tickets' && <DataTable columns={columns} rows={tickets} rowKey={(t) => t.id} empty="No tickets yet." />}

      {tab === 'faqs' && (
        <div className="max-w-2xl space-y-2">
          {FAQS.map((f, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-800">
                {f.q}
                <span className="text-slate-400">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">{f.a}</div>}
            </div>
          ))}
        </div>
      )}

      {raising && (
        <Modal
          title="Raise Support Ticket"
          onClose={() => setRaising(false)}
          footer={
            <>
              <Button onClick={() => setRaising(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setTickets((p) => [
                    { id: `TK-${3392 + p.length}`, subject: 'New ticket', priority: 'Medium', status: 'Open', updated: '2026-07-10 10:00' },
                    ...p,
                  ]);
                  setRaising(false);
                }}
              >
                Submit ticket
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Field label="Subject"><Input placeholder="Brief summary of your issue" /></Field>
            <Field label="Priority">
              <Select
                value="Medium"
                onChange={() => {}}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                ]}
              />
            </Field>
            <Field label="Description">
              <textarea rows={4} placeholder="Describe your issue…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400" />
            </Field>
          </div>
        </Modal>
      )}

      {selected && (
        <Modal
          title={`${selected.id} · ${selected.subject}`}
          onClose={() => setSelected(null)}
          wide
          footer={<Button variant="primary" onClick={() => setSelected(null)}>Send reply</Button>}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={PRIORITY_TONE[selected.priority]}>{selected.priority} priority</Badge>
            <Badge tone={STATUS_TONE[selected.status]}>{selected.status}</Badge>
          </div>
          <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
            <p>You raised: {selected.subject}.</p>
            <p className="text-xs text-slate-400">Last updated {selected.updated}</p>
          </div>
          <div className="mt-3">
            <Field label="Reply">
              <textarea rows={3} placeholder="Add a reply…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400" />
            </Field>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
