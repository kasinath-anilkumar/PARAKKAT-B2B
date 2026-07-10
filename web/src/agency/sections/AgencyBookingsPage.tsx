import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Modal, PageHeader, SearchInput, Stat, Tabs, inr, type Column, type Tone } from '../../components/ui/kit';
import { AGENCY_BOOKINGS, type AgencyBooking, type BookingCategory, type PayState } from '../mock';

const CAT_TONE: Record<BookingCategory, Tone> = { Upcoming: 'blue', Completed: 'green', Cancelled: 'red', Pending: 'amber' };
const PAY_TONE: Record<PayState, Tone> = { Paid: 'green', Pending: 'amber', Refunded: 'violet', Failed: 'red' };
const TABS: (BookingCategory | 'All')[] = ['All', 'Upcoming', 'Pending', 'Completed', 'Cancelled'];

export function AgencyBookingsPage() {
  const [bookings, setBookings] = useState<AgencyBooking[]>(AGENCY_BOOKINGS);
  const [tab, setTab] = useState<BookingCategory | 'All'>('All');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<AgencyBooking | null>(null);

  const rows = useMemo(
    () =>
      bookings.filter(
        (b) => (tab === 'All' || b.category === tab) && [b.id, b.guest, b.resort, b.agent].some((f) => f.toLowerCase().includes(q.toLowerCase())),
      ),
    [bookings, tab, q],
  );

  const cancel = (id: string) =>
    setBookings((p) => p.map((b) => (b.id === id ? { ...b, category: 'Cancelled', payment: 'Refunded' } : b)));

  const columns: Column<AgencyBooking>[] = [
    { header: 'Booking ID', className: 'font-mono text-xs font-medium text-slate-700', render: (b) => b.id },
    {
      header: 'Guest / Resort',
      render: (b) => (
        <div>
          <div className="font-medium text-slate-800">{b.guest}</div>
          <div className="text-xs text-slate-400">{b.resort}</div>
        </div>
      ),
    },
    { header: 'Agent', render: (b) => b.agent },
    { header: 'Stay', render: (b) => <span className="text-slate-500">{b.checkIn} → {b.checkOut}</span> },
    { header: 'Amount', align: 'right', className: 'font-medium text-slate-800', render: (b) => inr(b.amount) },
    { header: 'Status', render: (b) => <Badge tone={CAT_TONE[b.category]}>{b.category}</Badge> },
    {
      header: 'Actions',
      align: 'right',
      render: (b) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" onClick={() => setSelected(b)}>View</Button>
          {(b.category === 'Upcoming' || b.category === 'Pending') && (
            <>
              <Button variant="secondary" onClick={() => alert('Opens the modify-booking flow (within policy).')}>Modify</Button>
              <Button variant="danger" onClick={() => cancel(b.id)}>Cancel</Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const count = (c: BookingCategory) => bookings.filter((b) => b.category === c).length;

  return (
    <AppShell>
      <PageHeader
        title="Booking Management"
        subtitle="Create, modify, cancel and track your agency's bookings."
        actions={<Link to="/book"><Button variant="primary">+ New Booking</Button></Link>}
      />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Upcoming" value={count('Upcoming')} tone="blue" />
        <Stat label="Pending" value={count('Pending')} tone="amber" />
        <Stat label="Completed" value={count('Completed')} tone="green" />
        <Stat label="Cancelled" value={count('Cancelled')} tone="red" />
      </div>

      <Tabs tabs={TABS.map((t) => ({ key: t, label: t }))} active={tab} onChange={(k) => setTab(k as BookingCategory | 'All')} />

      <div className="mb-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search by ID, guest, resort…" />
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(b) => b.id} empty="No bookings in this view." />

      {selected && (
        <Modal
          title={`Booking ${selected.id}`}
          onClose={() => setSelected(null)}
          wide
          footer={
            <>
              <Button onClick={() => setSelected(null)}>Close</Button>
              <Button variant="primary" onClick={() => alert('Voucher PDF downloaded.')}>Download Voucher</Button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="Guest" value={selected.guest} />
            <Detail label="Booked by" value={selected.agent} />
            <Detail label="Resort" value={selected.resort} />
            <Detail label="Amount" value={inr(selected.amount)} />
            <Detail label="Check-in" value={selected.checkIn} />
            <Detail label="Check-out" value={selected.checkOut} />
            <Detail label="Status" value={<Badge tone={CAT_TONE[selected.category]}>{selected.category}</Badge>} />
            <Detail label="Payment" value={<Badge tone={PAY_TONE[selected.payment]}>{selected.payment}</Badge>} />
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 font-medium text-slate-800">{value}</div>
    </div>
  );
}
