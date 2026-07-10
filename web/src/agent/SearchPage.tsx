import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../hooks/useAuth';
import { Badge, Button, Field, Input, Modal, PageHeader, Select, inr } from '../components/ui/kit';
import { Icons } from '../components/layout/icons';
import * as bookingApi from '../api/booking.api';
import type { Booking, PricedRoomType, Resort } from '../types/booking';

const MEAL_PLANS = ['Room Only', 'CP · Breakfast', 'MAP · Half Board', 'AP · Full Board'];
const CANCELLATION = [
  'Free cancellation until 48h before check-in',
  'Free cancellation until 72h before check-in',
  'Non-refundable — 100% charge on cancellation',
];
const AMENITIES = ['Pool', 'Spa', 'Restaurant', 'Beach', 'Wi-Fi', 'Parking', 'Bar', 'Gym'];
const GRADIENTS = ['from-sky-100 to-blue-100', 'from-emerald-100 to-green-100', 'from-amber-100 to-orange-100', 'from-violet-100 to-purple-100'];

/** Deterministic mock enrichment for a room (meal plan, discount, offer, etc.). */
function roomProfile(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const amenities = AMENITIES.filter((_, i) => (h >> i) & 1).slice(0, 4);
  return {
    discount: [0, 5, 10, 15][h % 4],
    mealPlan: MEAL_PLANS[h % MEAL_PLANS.length],
    cancellation: CANCELLATION[h % CANCELLATION.length],
    amenities: amenities.length ? amenities : ['Wi-Fi', 'Restaurant'],
    offer: h % 3 === 0 ? 'Monsoon Special' : null,
    gradient: GRADIENTS[h % GRADIENTS.length],
  };
}

export function SearchPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const myBookingsPath = user?.role === 'AGENT' ? '/agent/bookings' : '/agency/bookings';

  const [resorts, setResorts] = useState<Resort[]>([]);
  const [form, setForm] = useState({ destination: 'all', resortId: '', checkIn: '', checkOut: '', guests: 2, rooms: 1 });
  const [filters, setFilters] = useState({ roomType: '', mealPlan: 'any', priceMin: '', priceMax: '', amenities: [] as string[] });
  const [results, setResults] = useState<PricedRoomType[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Booking flow
  const [selectedRoom, setSelectedRoom] = useState<PricedRoomType | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [guest, setGuest] = useState({ name: '', phone: '', email: '', requests: '' });

  const refreshAll = () =>
    ['bookings', 'balance', 'invoices', 'agency-summary', 'agent-summary'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

  useEffect(() => {
    bookingApi.listResorts().then((r) => {
      setResorts(r);
      setForm((f) => ({ ...f, resortId: r[0]?.id ?? '' }));
    });
  }, []);

  const destinations = useMemo(() => Array.from(new Set(resorts.map((r) => r.location))), [resorts]);
  const visibleResorts = useMemo(
    () => (form.destination === 'all' ? resorts : resorts.filter((r) => r.location === form.destination)),
    [resorts, form.destination],
  );

  async function search(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      setResults(await bookingApi.searchAvailability({ resortId: form.resortId, checkIn: form.checkIn, checkOut: form.checkOut, guests: form.guests }));
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }

  // Client-side refinement of the returned rooms by the secondary filters.
  const refined = useMemo(() => {
    if (!results) return null;
    const min = filters.priceMin ? Number(filters.priceMin) : 0;
    const max = filters.priceMax ? Number(filters.priceMax) : Infinity;
    return results.filter((rt) => {
      const p = roomProfile(rt.roomTypeId);
      if (rt.agencyPriceTotal < min || rt.agencyPriceTotal > max) return false;
      if (filters.roomType && !rt.roomTypeName.toLowerCase().includes(filters.roomType.toLowerCase())) return false;
      if (filters.mealPlan !== 'any' && p.mealPlan !== filters.mealPlan) return false;
      if (filters.amenities.length && !filters.amenities.every((a) => p.amenities.includes(a))) return false;
      return true;
    });
  }, [results, filters]);

  const selectedResort = resorts.find((r) => r.id === form.resortId);

  async function confirmBooking() {
    if (!selectedRoom) return;
    setError(null);
    setBusy(true);
    try {
      const b = await bookingApi.createBooking({
        resortId: form.resortId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: form.guests,
        roomTypeId: selectedRoom.roomTypeId,
      });
      setBooking(b);
      refreshAll();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!booking) return;
    setBusy(true);
    try {
      setBooking(await bookingApi.payBooking(booking.id));
      refreshAll();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }

  function closeBooking() {
    setSelectedRoom(null);
    setBooking(null);
    setGuest({ name: '', phone: '', email: '', requests: '' });
    setError(null);
  }

  const toggleAmenity = (a: string) =>
    setFilters((f) => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] }));

  return (
    <AppShell>
      <PageHeader
        title="Search & Book"
        subtitle="Find live availability at your agency price and confirm in a few clicks."
        actions={<Link to={myBookingsPath}><Button variant="secondary">My Bookings</Button></Link>}
      />

      {/* Search panel */}
      <form onSubmit={search} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Field label="Destination">
            <Select
              value={form.destination}
              onChange={(v) => {
                const first = v === 'all' ? resorts[0] : resorts.find((r) => r.location === v);
                setForm((f) => ({ ...f, destination: v, resortId: first?.id ?? '' }));
              }}
              options={[{ value: 'all', label: 'All destinations' }, ...destinations.map((d) => ({ value: d, label: d }))]}
            />
          </Field>
          <Field label="Resort">
            <Select
              value={form.resortId}
              onChange={(v) => setForm((f) => ({ ...f, resortId: v }))}
              options={visibleResorts.map((r) => ({ value: r.id, label: r.name }))}
            />
          </Field>
          <Field label="Check-in"><Input type="date" required value={form.checkIn} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} /></Field>
          <Field label="Check-out"><Input type="date" required value={form.checkOut} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} /></Field>
          <Field label="Guests"><Input type="number" min={1} max={20} value={form.guests} onChange={(e) => setForm((f) => ({ ...f, guests: Number(e.target.value) }))} /></Field>
          <Field label="Rooms"><Input type="number" min={1} max={10} value={form.rooms} onChange={(e) => setForm((f) => ({ ...f, rooms: Number(e.target.value) }))} /></Field>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Room type"><Input placeholder="e.g. Deluxe" value={filters.roomType} onChange={(e) => setFilters((f) => ({ ...f, roomType: e.target.value }))} /></Field>
          <Field label="Meal plan">
            <Select value={filters.mealPlan} onChange={(v) => setFilters((f) => ({ ...f, mealPlan: v }))} options={[{ value: 'any', label: 'Any' }, ...MEAL_PLANS.map((m) => ({ value: m, label: m }))]} />
          </Field>
          <Field label="Min price (₹)"><Input type="number" placeholder="0" value={filters.priceMin} onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value }))} /></Field>
          <Field label="Max price (₹)"><Input type="number" placeholder="Any" value={filters.priceMax} onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value }))} /></Field>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">Amenities</div>
            <div className="flex flex-wrap gap-1.5">
              {AMENITIES.map((a) => {
                const on = filters.amenities.includes(a);
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
          <Button variant="primary" type="submit" disabled={busy || !form.resortId}>
            <Icons.search className="h-4 w-4" /> {busy ? 'Searching…' : 'Search'}
          </Button>
        </div>
      </form>

      {error && !selectedRoom && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Results */}
      {refined && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              {refined.length} room{refined.length === 1 ? '' : 's'} available
              {selectedResort && <span className="font-normal text-slate-400"> · {selectedResort.name}, {selectedResort.location}</span>}
            </h2>
          </div>

          {refined.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
              No rooms match your filters for these dates.
            </div>
          )}

          <div className="space-y-3">
            {refined.map((rt, i) => {
              const p = roomProfile(rt.roomTypeId);
              const original = p.discount ? Math.round(rt.agencyPriceTotal / (1 - p.discount / 100)) : null;
              return (
                <div key={rt.roomTypeId} className="animate-fade-up overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md sm:flex" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className={`flex h-32 items-center justify-center bg-gradient-to-br sm:h-auto sm:w-48 ${p.gradient} text-blue-500`}>
                    <Icons.resorts className="h-10 w-10" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-3 p-4 sm:flex-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{rt.roomTypeName}</h3>
                        {p.offer && <Badge tone="violet">{p.offer}</Badge>}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">{selectedResort?.name} · {selectedResort?.location}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone="slate">Sleeps {rt.maxOccupancy}</Badge>
                        <Badge tone={rt.availableCount <= 3 ? 'amber' : 'green'}>{rt.availableCount} left</Badge>
                        <Badge tone="blue">{p.mealPlan}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.amenities.map((a) => (
                          <span key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{a}</span>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                        <Icons.shield className="h-3.5 w-3.5 text-slate-400" /> {p.cancellation}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {original && <div className="text-xs text-slate-400 line-through">{inr(original)}</div>}
                      <div className="text-lg font-semibold text-slate-900">{inr(rt.agencyPriceTotal)}</div>
                      <div className="text-xs text-slate-400">{inr(rt.agencyPricePerNight)}/night · {rt.nights} night{rt.nights === 1 ? '' : 's'}</div>
                      {p.discount > 0 && <div className="mt-0.5 text-xs font-medium text-green-600">You save {p.discount}%</div>}
                      <Button variant="primary" className="mt-2 w-full justify-center" onClick={() => { setSelectedRoom(rt); setError(null); }}>Book</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!results && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icons.search className="h-6 w-6" /></div>
          <p className="text-sm text-slate-500">Choose your dates and search to see live availability at your agency price.</p>
        </div>
      )}

      {/* Booking modal: guest details → confirmation */}
      {selectedRoom && (
        <Modal
          title={booking ? 'Booking confirmed' : `Book · ${selectedRoom.roomTypeName}`}
          onClose={closeBooking}
          wide
          footer={
            booking ? (
              <>
                <Link to={myBookingsPath}><Button variant="secondary">View My Bookings</Button></Link>
                {booking.state === 'AWAITING_PAYMENT' ? (
                  <Button variant="primary" disabled={busy} onClick={pay}>Pay {inr(Number(booking.agencyPrice))}</Button>
                ) : (
                  <Button variant="primary" onClick={() => alert('Voucher PDF downloaded.')}>Download Voucher</Button>
                )}
              </>
            ) : (
              <>
                <Button onClick={closeBooking}>Cancel</Button>
                <Button variant="primary" disabled={busy} onClick={confirmBooking}>{busy ? 'Confirming…' : 'Confirm Booking'}</Button>
              </>
            )
          }
        >
          {/* Summary */}
          <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800">{selectedResort?.name} · {selectedRoom.roomTypeName}</div>
                <div className="text-xs text-slate-400">{form.checkIn} → {form.checkOut} · {form.guests} guest{form.guests === 1 ? '' : 's'} · {form.rooms} room{form.rooms === 1 ? '' : 's'}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-900">{inr(selectedRoom.agencyPriceTotal)}</div>
                <div className="text-xs text-slate-400">{selectedRoom.nights} night{selectedRoom.nights === 1 ? '' : 's'}</div>
              </div>
            </div>
          </div>

          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {booking ? (
            <div className="space-y-2">
              <div className={`rounded-lg px-3 py-2 text-sm ${booking.state === 'AWAITING_PAYMENT' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                {booking.state === 'AWAITING_PAYMENT'
                  ? `Room held${booking.holdExpiresAt ? ` until ${new Date(booking.holdExpiresAt).toLocaleTimeString()}` : ''}. Pay to confirm.`
                  : `Confirmed${booking.paymentMode === 'CREDIT' ? ' on credit' : ''}${booking.axisRoomsRef ? ` · ref ${booking.axisRoomsRef}` : ''}.`}
              </div>
              <div className="text-xs text-slate-500">Booking ID: <span className="font-mono text-slate-700">{booking.id}</span></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Guest details</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Lead guest name"><Input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} placeholder="Full name" /></Field>
                <Field label="Mobile number"><Input value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} placeholder="+91 …" /></Field>
                <Field label="Email"><Input type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} placeholder="guest@example.com" /></Field>
              </div>
              <Field label="Special requests (optional)">
                <textarea rows={2} value={guest.requests} onChange={(e) => setGuest({ ...guest, requests: e.target.value })} placeholder="Early check-in, airport pickup…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400" />
              </Field>
            </div>
          )}
        </Modal>
      )}
    </AppShell>
  );
}

function extractError(err: unknown): string {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Something went wrong';
}
