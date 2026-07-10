import { useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Modal, PageHeader, SearchInput, Select, Stat, Toolbar, inr, type Column, type Tone } from '../../components/ui/kit';
import { BOOKINGS, type BookingStatus, type MockBooking, type PayStatus } from '../mock';

const STATUS_TONE: Record<BookingStatus, Tone> = { Confirmed: 'green', Pending: 'amber', Cancelled: 'red', Completed: 'blue' };
const PAY_TONE: Record<PayStatus, Tone> = { Paid: 'green', Pending: 'amber', Failed: 'red', Refunded: 'violet' };

export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<MockBooking[]>(BOOKINGS);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<MockBooking | null>(null);

  const rows = useMemo(
    () =>
      bookings.filter(
        (b) =>
          (status === 'all' || b.status.toLowerCase() === status) &&
          [b.id, b.guest, b.resort, b.agency].some((f) => f.toLowerCase().includes(q.toLowerCase())),
      ),
    [bookings, q, status],
  );

  const setStatusOf = (id: string, s: BookingStatus, pay?: PayStatus) =>
    setBookings((p) => p.map((b) => (b.id === id ? { ...b, status: s, payment: pay ?? b.payment } : b)));

  const columns: Column<MockBooking>[] = [
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
    { header: 'Agency', render: (b) => b.agency },
    { header: 'Stay', render: (b) => <span className="text-slate-500">{b.checkIn} → {b.checkOut}</span> },
    { header: 'Amount', align: 'right', className: 'font-medium text-slate-800', render: (b) => inr(b.amount) },
    { header: 'Status', render: (b) => <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge> },
    { header: 'Payment', render: (b) => <Badge tone={PAY_TONE[b.payment]}>{b.payment}</Badge> },
    {
      header: 'Actions',
      align: 'right',
      render: (b) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" onClick={() => setSelected(b)}>View</Button>
          {b.status === 'Pending' && <Button variant="secondary" onClick={() => setStatusOf(b.id, 'Confirmed', 'Paid')}>Confirm</Button>}
          {(b.status === 'Pending' || b.status === 'Confirmed') && (
            <Button variant="danger" onClick={() => setStatusOf(b.id, 'Cancelled', 'Refunded')}>Cancel</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Booking Management"
        subtitle="Search, filter, inspect and act on every booking across the platform."
        actions={<Button variant="primary">+ Manual Booking</Button>}
      />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={bookings.length} tone="blue" />
        <Stat label="Confirmed" value={bookings.filter((b) => b.status === 'Confirmed').length} tone="green" />
        <Stat label="Pending" value={bookings.filter((b) => b.status === 'Pending').length} tone="amber" />
        <Stat label="Cancelled" value={bookings.filter((b) => b.status === 'Cancelled').length} tone="red" />
      </div>

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search by ID, guest, resort…" />
        <Select
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'pending', label: 'Pending' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
      </Toolbar>

      <DataTable columns={columns} rows={rows} rowKey={(b) => b.id} empty="No bookings match your filters." />

      {selected && (
        <Modal title={`Booking ${selected.id}`} onClose={() => setSelected(null)} wide>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="Guest" value={selected.guest} />
            <Detail label="Agency" value={selected.agency} />
            <Detail label="Resort" value={selected.resort} />
            <Detail label="Amount" value={inr(selected.amount)} />
            <Detail label="Check-in" value={selected.checkIn} />
            <Detail label="Check-out" value={selected.checkOut} />
            <Detail label="Status" value={<Badge tone={STATUS_TONE[selected.status]}>{selected.status}</Badge>} />
            <Detail label="Payment" value={<Badge tone={PAY_TONE[selected.payment]}>{selected.payment}</Badge>} />
          </div>
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Timeline</div>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li>• Created by {selected.agency} — {selected.checkIn}</li>
              <li>• Payment {selected.payment.toLowerCase()} via Airpay</li>
              <li>• CRS confirmation received</li>
            </ul>
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
