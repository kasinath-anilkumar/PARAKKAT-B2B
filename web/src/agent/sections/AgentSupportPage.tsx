import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, PageHeader, Tabs, type Column } from '../../components/ui/kit';
import { SkeletonRows } from '../../components/ui/Skeleton';
import * as supportApi from '../../api/support.api';
import type { TicketSummary } from '../../api/support.api';
import { PRIORITY_TONE, RaiseTicketModal, STATUS_TONE, TicketModal } from '../../shared/SupportTicketModal';

const FAQS = [
  { q: 'How do I make a booking?', a: 'Go to Search & Book, pick dates and occupancy, choose a room and rate plan, then add it to your cart and confirm.' },
  { q: 'Can I book a day-use (same-day) stay?', a: 'Yes — toggle "Day use" on the Search & Book page to see same-day rates.' },
  { q: 'How do I cancel a booking?', a: 'Open My Bookings, select the booking and choose Cancel. Cancellation charges follow the policy for the dates.' },
  { q: 'Where do I see a guest’s history?', a: 'Guest Management lists your travellers with their stays; open a guest to see full booking history.' },
  { q: 'Why can’t I perform an action?', a: 'Your permissions are set by your agency. Ask your agency admin to enable booking, cancel, modify or reports access.' },
];
const fmt = (d: string) => new Date(d).toLocaleString('en-IN');

export function AgentSupportPage() {
  const [tab, setTab] = useState('tickets');
  const [raising, setRaising] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const { data: tickets = [], isLoading } = useQuery({ queryKey: ['support', 'mine'], queryFn: () => supportApi.listTickets() });

  const columns: Column<TicketSummary>[] = [
    { header: 'Subject', className: 'font-medium text-slate-800', render: (t) => t.subject },
    { header: 'Category', render: (t) => t.category ?? '—' },
    { header: 'Priority', render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge> },
    { header: 'Status', render: (t) => <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge> },
    { header: 'Updated', render: (t) => <span className="text-slate-500">{fmt(t.updatedAt)}</span> },
    { header: 'Actions', align: 'right', render: (t) => <Button variant="ghost" onClick={() => setOpenId(t.id)}>Open</Button> },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Support"
        subtitle="Raise a ticket, track its status and browse FAQs."
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

      {tab === 'tickets' &&
        (isLoading ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm"><tbody><SkeletonRows rows={5} cols={6} /></tbody></table>
          </div>
        ) : (
          <DataTable columns={columns} rows={tickets} rowKey={(t) => t.id} empty="No tickets yet. Raise one and our team will respond." />
        ))}

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

      {raising && <RaiseTicketModal onClose={() => setRaising(false)} onCreated={(id) => { setRaising(false); setOpenId(id); }} />}
      {openId && <TicketModal id={openId} onClose={() => setOpenId(null)} />}
    </AppShell>
  );
}
