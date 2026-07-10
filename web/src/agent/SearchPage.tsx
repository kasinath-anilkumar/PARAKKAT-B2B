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

/** Deterministic mock enrichment layered on the CRS room (meal plan, policy…). */
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
const gradientFor = (id: string) => roomProfile(id).gradient;

type Availability = Record<string, PricedRoomType[]>;

export function SearchPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const myBookingsPath = user?.role === 'AGENT' ? '/agent/bookings' : '/agency/bookings';

  const [resorts, setResorts] = useState<Resort[]>([]);
  const [dates, setDates] = useState({ destination: 'all', checkIn: '', checkOut: '', guests: 2, rooms: 1 });

  const [availability, setAvailability] = useState<Availability | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Resort | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Room-level filters (applied once a hotel is opened).
  const [filters, setFilters] = useState({ roomType: '', mealPlan: 'any', priceMin: '', priceMax: '', amenities: [] as string[] });

  // Booking flow
  const [selectedRoom, setSelectedRoom] = useState<PricedRoomType | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [guest, setGuest] = useState({ name: '', phone: '', email: '', requests: '' });
  const [busy, setBusy] = useState(false);

  const refreshAll = () =>
    ['bookings', 'balance', 'invoices', 'agency-summary', 'agent-summary'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

  useEffect(() => {
    bookingApi.listResorts().then(setResorts);
  }, []);

  const destinations = useMemo(() => Array.from(new Set(resorts.map((r) => r.location))), [resorts]);
  const visibleResorts = useMemo(
    () => (dates.destination === 'all' ? resorts : resorts.filter((r) => r.location === dates.destination)),
    [resorts, dates.destination],
  );
  const datesChosen = !!dates.checkIn && !!dates.checkOut;

  /** Date-first: fan out the CRS availability check across all hotels for the chosen dates. */
  async function findHotels(e: FormEvent) {
    e.preventDefault();
    if (!datesChosen) {
      setNotice('Please select your check-in and check-out dates first.');
      return;
    }
    setNotice(null);
    setError(null);
    setSelectedHotel(null);
    setAvailability(null);
    setSearching(true);
    const list = visibleResorts;
    const settled = await Promise.allSettled(
      list.map((r) => bookingApi.searchAvailability({ resortId: r.id, checkIn: dates.checkIn, checkOut: dates.checkOut, guests: dates.guests })),
    );
    const map: Availability = {};
    list.forEach((r, i) => {
      const s = settled[i];
      map[r.id] = s.status === 'fulfilled' ? s.value : [];
    });
    setAvailability(map);
    setSearching(false);
  }

  const hotelsSorted = useMemo(() => {
    if (!availability) return [];
    return [...visibleResorts].sort((a, b) => (availability[b.id]?.length ? 1 : 0) - (availability[a.id]?.length ? 1 : 0));
  }, [visibleResorts, availability]);

  const availableCount = availability ? Object.values(availability).filter((r) => r.length > 0).length : 0;

  function openHotel(r: Resort) {
    if (!datesChosen) {
      setNotice('Please select your dates first.');
      return;
    }
    const rooms = availability?.[r.id] ?? [];
    if (rooms.length === 0) {
      setNotice(`${r.name} has no availability for these dates — showing hotels that are available.`);
      return;
    }
    setNotice(null);
    setSelectedHotel(r);
    setFilters({ roomType: '', mealPlan: 'any', priceMin: '', priceMax: '', amenities: [] });
  }

  // Rooms for the opened hotel, after room-level filters.
  const rooms = useMemo(() => {
    if (!selectedHotel || !availability) return [];
    const min = filters.priceMin ? Number(filters.priceMin) : 0;
    const max = filters.priceMax ? Number(filters.priceMax) : Infinity;
    return (availability[selectedHotel.id] ?? []).filter((rt) => {
      const p = roomProfile(rt.roomTypeId);
      if (rt.agencyPriceTotal < min || rt.agencyPriceTotal > max) return false;
      if (filters.roomType && !rt.roomTypeName.toLowerCase().includes(filters.roomType.toLowerCase())) return false;
      if (filters.mealPlan !== 'any' && p.mealPlan !== filters.mealPlan) return false;
      if (filters.amenities.length && !filters.amenities.every((a) => p.amenities.includes(a))) return false;
      return true;
    });
  }, [selectedHotel, availability, filters]);

  async function confirmBooking() {
    if (!selectedRoom || !selectedHotel) return;
    setError(null);
    setBusy(true);
    try {
      const b = await bookingApi.createBooking({
        resortId: selectedHotel.id,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        guests: dates.guests,
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
        subtitle="Live hotel availability from the resort's reservation system (AxisRooms) at your agency price."
        actions={<Link to={myBookingsPath}><Button variant="secondary">My Bookings</Button></Link>}
      />

      {/* Step 1 — pick dates first */}
      <form onSubmit={findHotels} className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">1</span> Select dates
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Field label="Destination">
            <Select
              value={dates.destination}
              onChange={(v) => setDates((d) => ({ ...d, destination: v }))}
              options={[{ value: 'all', label: 'All destinations' }, ...destinations.map((x) => ({ value: x, label: x }))]}
            />
          </Field>
          <Field label="Check-in"><Input type="date" required value={dates.checkIn} onChange={(e) => setDates((d) => ({ ...d, checkIn: e.target.value }))} /></Field>
          <Field label="Check-out"><Input type="date" required value={dates.checkOut} onChange={(e) => setDates((d) => ({ ...d, checkOut: e.target.value }))} /></Field>
          <Field label="Guests"><Input type="number" min={1} max={20} value={dates.guests} onChange={(e) => setDates((d) => ({ ...d, guests: Number(e.target.value) }))} /></Field>
          <Field label="Rooms"><Input type="number" min={1} max={10} value={dates.rooms} onChange={(e) => setDates((d) => ({ ...d, rooms: Number(e.target.value) }))} /></Field>
          <div className="flex items-end">
            <Button variant="primary" type="submit" disabled={searching} className="w-full justify-center">
              <Icons.search className="h-4 w-4" /> {searching ? 'Checking…' : 'Find Hotels'}
            </Button>
          </div>
        </div>
      </form>

      {notice && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}
      {error && !selectedRoom && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Empty state */}
      {!availability && !searching && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icons.bookings className="h-6 w-6" /></div>
          <p className="text-sm text-slate-500">Select your dates and search — we will show hotels with live availability from AxisRooms.</p>
        </div>
      )}

      {searching && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white">
              <div className="h-28 rounded-t-xl bg-slate-100" />
              <div className="space-y-2 p-4"><div className="h-4 w-2/3 rounded bg-slate-100" /><div className="h-3 w-1/2 rounded bg-slate-100" /></div>
            </div>
          ))}
        </div>
      )}

      {/* Step 2 — hotels for the chosen dates */}
      {availability && !selectedHotel && !searching && (
        <>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">2</span>
            {availableCount} of {hotelsSorted.length} hotels available · {dates.checkIn} → {dates.checkOut}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {hotelsSorted.map((r, i) => {
              const hotelRooms = availability[r.id] ?? [];
              const available = hotelRooms.length > 0;
              const fromPrice = available ? Math.min(...hotelRooms.map((x) => x.agencyPriceTotal)) : 0;
              return (
                <div
                  key={r.id}
                  className={`animate-fade-up overflow-hidden rounded-xl border bg-white transition ${available ? 'border-slate-200 hover:shadow-md' : 'border-slate-200 opacity-70'}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${gradientFor(r.id)} text-blue-500`}>
                    <Icons.resorts className="h-9 w-9" />
                    <span className="absolute right-2 top-2">
                      <Badge tone={available ? 'green' : 'red'}>{available ? 'Available' : 'Sold out'}</Badge>
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-slate-800">{r.name}</div>
                    <div className="text-xs text-slate-400">{r.location}</div>
                    {available ? (
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <div className="text-[11px] text-slate-400">from</div>
                          <div className="text-lg font-semibold text-slate-900">{inr(fromPrice)}</div>
                          <div className="text-[11px] text-slate-400">{hotelRooms.length} room type{hotelRooms.length === 1 ? '' : 's'}</div>
                        </div>
                        <Button variant="primary" onClick={() => openHotel(r)}>View Rooms</Button>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-slate-400">No rooms for these dates. Try different dates.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Step 3 — rooms for the selected hotel */}
      {selectedHotel && availability && (
        <>
          <button onClick={() => setSelectedHotel(null)} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
            <Icons.chevronLeft className="h-4 w-4" /> Back to hotels
          </button>
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${gradientFor(selectedHotel.id)} text-blue-500`}>
              <Icons.resorts className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">{selectedHotel.name}</div>
              <div className="text-xs text-slate-400">{selectedHotel.location} · {dates.checkIn} → {dates.checkOut} · {dates.guests} guest{dates.guests === 1 ? '' : 's'}</div>
            </div>
          </div>

          {/* Room-level filters */}
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Room type"><Input placeholder="e.g. Deluxe" value={filters.roomType} onChange={(e) => setFilters((f) => ({ ...f, roomType: e.target.value }))} /></Field>
            <Field label="Meal plan">
              <Select value={filters.mealPlan} onChange={(v) => setFilters((f) => ({ ...f, mealPlan: v }))} options={[{ value: 'any', label: 'Any' }, ...MEAL_PLANS.map((m) => ({ value: m, label: m }))]} />
            </Field>
            <Field label="Min price (₹)"><Input type="number" placeholder="0" value={filters.priceMin} onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value }))} /></Field>
            <Field label="Max price (₹)"><Input type="number" placeholder="Any" value={filters.priceMax} onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value }))} /></Field>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {AMENITIES.map((a) => {
              const on = filters.amenities.includes(a);
              return (
                <button key={a} type="button" onClick={() => toggleAmenity(a)} className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                  {a}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {rooms.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">No rooms match your filters.</div>}
            {rooms.map((rt, i) => {
              const p = roomProfile(rt.roomTypeId);
              const original = p.discount ? Math.round(rt.agencyPriceTotal / (1 - p.discount / 100)) : null;
              return (
                <div key={rt.roomTypeId} className="animate-fade-up overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md sm:flex" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className={`flex h-28 items-center justify-center bg-gradient-to-br sm:h-auto sm:w-40 ${p.gradient} text-blue-500`}>
                    <Icons.bookings className="h-9 w-9" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-3 p-4 sm:flex-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{rt.roomTypeName}</h3>
                        {p.offer && <Badge tone="violet">{p.offer}</Badge>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone="slate">Sleeps {rt.maxOccupancy}</Badge>
                        <Badge tone={rt.availableCount <= 3 ? 'amber' : 'green'}>{rt.availableCount} left</Badge>
                        <Badge tone="blue">{p.mealPlan}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.amenities.map((a) => <span key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{a}</span>)}
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Icons.shield className="h-3.5 w-3.5 text-slate-400" /> {p.cancellation}</div>
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

      {/* Booking modal: guest details → confirmation */}
      {selectedRoom && selectedHotel && (
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
          <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800">{selectedHotel.name} · {selectedRoom.roomTypeName}</div>
                <div className="text-xs text-slate-400">{dates.checkIn} → {dates.checkOut} · {dates.guests} guest{dates.guests === 1 ? '' : 's'} · {dates.rooms} room{dates.rooms === 1 ? '' : 's'}</div>
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
                  : `Confirmed${booking.paymentMode === 'CREDIT' ? ' on credit' : ''}${booking.axisRoomsRef ? ` · AxisRooms ref ${booking.axisRoomsRef}` : ''}.`}
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
