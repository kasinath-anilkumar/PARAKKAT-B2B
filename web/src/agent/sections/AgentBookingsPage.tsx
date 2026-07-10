import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Field, Modal, PageHeader, SearchInput, Stat, Tabs, inr, type Column, type Tone } from '../../components/ui/kit';
import { CountUp } from '../../components/ui/CountUp';
import { AGENT_BOOKINGS, type AgentBooking, type BookingCategory, type PayState } from '../mock';

const lift = 'transition duration-200 hover:-translate-y-0.5 hover:shadow-md';

const CAT_TONE: Record<BookingCategory, Tone> = { Upcoming: 'blue', Completed: 'green', Cancelled: 'red', Pending: 'amber' };
const PAY_TONE: Record<PayState, Tone> = { Paid: 'green', Pending: 'amber', Refunded: 'violet', Failed: 'red' };
const TABS: (BookingCategory | 'All')[] = ['All', 'Upcoming', 'Pending', 'Completed', 'Cancelled'];

export function AgentBookingsPage() {
  const [bookings, setBookings] = useState<AgentBooking[]>(AGENT_BOOKINGS);
  const [tab, setTab] = useState<BookingCategory | 'All'>('All');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<AgentBooking | null>(null);

  const rows = useMemo(
    () =>
      bookings.filter(
        (b) => (tab === 'All' || b.category === tab) && [b.id, b.guest, b.resort].some((f) => f.toLowerCase().includes(q.toLowerCase())),
      ),
    [bookings, tab, q],
  );

  const cancel = (id: string) => setBookings((p) => p.map((b) => (b.id === id ? { ...b, category: 'Cancelled', payment: 'Refunded' } : b)));
  const count = (c: BookingCategory) => bookings.filter((b) => b.category === c).length;

  const columns: Column<AgentBooking>[] = [
    { header: 'Booking ID', className: 'font-mono text-xs font-medium text-slate-700', render: (b) => b.id },
    {
      header: 'Guest / Resort',
      render: (b) => (
        <div>
          <div className="font-medium text-slate-800">{b.guest}</div>
          <div className="text-xs text-slate-400">{b.resort} · {b.room}</div>
        </div>
      ),
    },
    { header: 'Stay', render: (b) => <span className="text-slate-500">{b.checkIn} → {b.checkOut}</span> },
    { header: 'Amount', align: 'right', className: 'font-medium text-slate-800', render: (b) => inr(b.amount) },
    { header: 'Status', render: (b) => <Badge tone={CAT_TONE[b.category]}>{b.category}</Badge> },
    {
      header: 'Actions',
      align: 'right',
      render: (b) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" onClick={() => setSelected(b)}>View</Button>
          {b.category === 'Cancelled' ? (
            <Button variant="secondary" onClick={() => alert('Opens the rebook flow with the same details.')}>Rebook</Button>
          ) : (
            (b.category === 'Upcoming' || b.category === 'Pending') && (
              <Button variant="danger" onClick={() => cancel(b.id)}>Cancel</Button>
            )
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Booking Management"
        subtitle="Create, view and manage your bookings. Available actions depend on the permissions your agency has granted you."
        actions={<Link to="/book"><Button variant="primary">+ New Booking</Button></Link>}
      />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Upcoming" value={<CountUp to={count('Upcoming')} />} tone="blue" className={lift} />
        <Stat label="Pending" value={<CountUp to={count('Pending')} />} tone="amber" className={lift} />
        <Stat label="Completed" value={<CountUp to={count('Completed')} />} tone="green" className={lift} />
        <Stat label="Cancelled" value={<CountUp to={count('Cancelled')} />} tone="red" className={lift} />
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
              <Button variant="secondary" onClick={() => alert('Voucher printed.')}>Print</Button>
              <Button variant="secondary" onClick={() => alert(`Voucher emailed to ${selected.guest}.`)}>Send to Customer</Button>
              <Button variant="primary" onClick={() => alert('Voucher PDF downloaded.')}>Download Voucher</Button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="Guest" value={selected.guest} />
            <Detail label="Room" value={selected.room} />
            <Detail label="Resort" value={selected.resort} />
            <Detail label="Amount" value={inr(selected.amount)} />
            <Detail label="Check-in" value={selected.checkIn} />
            <Detail label="Check-out" value={selected.checkOut} />
            <Detail label="Status" value={<Badge tone={CAT_TONE[selected.category]}>{selected.category}</Badge>} />
            <Detail label="Payment" value={<Badge tone={PAY_TONE[selected.payment]}>{selected.payment}</Badge>} />
          </div>
          <div className="mt-4">
            <Field label="Add a note">
              <textarea rows={2} placeholder="Internal note for this booking…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400" />
            </Field>
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
