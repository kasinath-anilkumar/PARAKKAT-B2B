import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../hooks/useAuth';
import { Badge, Button, Field, Input, Modal, PageHeader, Select, inr } from '../components/ui/kit';
import { Icons } from '../components/layout/icons';
import * as bookingApi from '../api/booking.api';
import type { BrowseRoom } from '../api/booking.api';
import type { PricedRoomType, RatePlan } from '../types/booking';

const PLAN_ORDER: RatePlan[] = ['EP', 'CP', 'MAP', 'AP'];
const PLAN_LABEL: Record<RatePlan, string> = { EP: 'EP · Room only', CP: 'CP · Breakfast', MAP: 'MAP · Half board', AP: 'AP · Full board' };
const GRADIENTS = ['from-sky-100 to-blue-100', 'from-emerald-100 to-green-100', 'from-amber-100 to-orange-100', 'from-violet-100 to-purple-100'];

function gradientFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}
const cheapestPlan = (rt: PricedRoomType): RatePlan => rt.plans.reduce((a, b) => (a.priceTotal <= b.priceTotal ? a : b)).plan;
const sortedPlans = (rt: PricedRoomType) => [...rt.plans].sort((a, b) => PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan));

// Stay-date guardrails (mirror the server defaults; the server is authoritative).
const MAX_ADVANCE_DAYS = 365;
const MAX_STAY_NIGHTS = 30;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => ymd(new Date());
function addDaysStr(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + days);
  return ymd(d);
}
function nightsBetweenStr(checkIn: string, checkOut: string): number {
  return Math.round((new Date(`${checkOut}T00:00:00`).getTime() - new Date(`${checkIn}T00:00:00`).getTime()) / 86400000);
}

const roomKey = (resortId: string, roomTypeId: string) => `${resortId}::${roomTypeId}`;

interface Occupancy {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  childAges: number[];
  extraBeds: number;
}

interface CartLine {
  key: string;
  resortId: string;
  resortName: string;
  roomTypeId: string;
  roomTypeName: string;
  plan: RatePlan;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  childAges: number[];
  extraBeds: number;
  nights: number;
  priceTotal: number;
}

export function SearchPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const myBookingsPath = user?.role === 'AGENT' ? '/agent/bookings' : '/agency/bookings';

  const { data: rooms = [], isLoading } = useQuery({ queryKey: ['browse-rooms'], queryFn: bookingApi.browseRooms });

  const [destination, setDestination] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [occ, setOcc] = useState<Occupancy>({ checkIn: '', checkOut: '', adults: 2, children: 0, childAges: [], extraBeds: 0 });

  // Availability result for the currently-searched dates (null = not searched yet).
  const [searched, setSearched] = useState<{ occ: Occupancy; avail: Record<string, PricedRoomType> } | null>(null);
  const [searching, setSearching] = useState(false);
  const [chosenPlan, setChosenPlan] = useState<Record<string, RatePlan>>({});
  const [notice, setNotice] = useState<string | null>(null);

  // Cart / checkout
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkout, setCheckout] = useState(false);
  const [guest, setGuest] = useState({ name: '', phone: '', email: '', idType: '', idNumber: '' });
  const [result, setResult] = useState<bookingApi.GroupBookingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAll = () => ['bookings', 'balance', 'invoices', 'agency-summary', 'agent-summary'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

  // Changing dates/occupancy invalidates a prior availability result — re-search required.
  function updateOcc(patch: Partial<Occupancy>) {
    setOcc((o) => ({ ...o, ...patch }));
    setSearched(null);
    setNotice(null);
  }
  function setChildren(n: number) {
    const count = Math.max(0, Math.min(20, n));
    setOcc((o) => ({ ...o, children: count, childAges: Array.from({ length: count }, (_, i) => o.childAges[i] ?? 5) }));
    setSearched(null);
  }

  const today = todayStr();
  const maxCheckIn = addDaysStr(today, MAX_ADVANCE_DAYS);
  const nights = occ.checkIn && occ.checkOut ? nightsBetweenStr(occ.checkIn, occ.checkOut) : 0;
  const dateError =
    !occ.checkIn || !occ.checkOut
      ? null
      : occ.checkIn < today
        ? 'Check-in cannot be in the past.'
        : occ.checkIn > maxCheckIn
          ? `Check-in cannot be more than ${MAX_ADVANCE_DAYS} days ahead.`
          : nights <= 0
            ? 'Check-out must be after check-in.'
            : nights > MAX_STAY_NIGHTS
              ? `A single booking cannot exceed ${MAX_STAY_NIGHTS} nights.`
              : null;
  const datesValid = !!occ.checkIn && !!occ.checkOut && !dateError;

  const destinations = useMemo(() => Array.from(new Set(rooms.map((r) => r.location))), [rooms]);
  const visibleRooms = useMemo(
    () =>
      rooms
        .filter((r) => destination === 'all' || r.location === destination)
        .filter((r) => [r.roomTypeName, r.resortName, r.location].some((f) => f.toLowerCase().includes(searchText.toLowerCase()))),
    [rooms, destination, searchText],
  );

  function nudgeDates() {
    setNotice('Please pick your check-in and check-out dates to see availability.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    (document.getElementById('search-checkin') as HTMLInputElement | null)?.focus();
  }

  async function runSearch() {
    if (!datesValid) { nudgeDates(); return; }
    setSearching(true);
    setNotice(null);
    // Verify against AxisRooms + the B2B channel policy for every resort in the catalog.
    const resortIds = [...new Set(rooms.map((r) => r.resortId))];
    const settled = await Promise.allSettled(
      resortIds.map((id) =>
        bookingApi.searchAvailability({ resortId: id, checkIn: occ.checkIn, checkOut: occ.checkOut, guests: occ.adults + occ.children, adults: occ.adults, children: occ.children, childAges: occ.childAges, extraBeds: occ.extraBeds }),
      ),
    );
    const avail: Record<string, PricedRoomType> = {};
    resortIds.forEach((id, i) => {
      const s = settled[i];
      if (s.status === 'fulfilled') for (const rt of s.value) avail[roomKey(id, rt.roomTypeId)] = rt;
    });
    setSearched({ occ: { ...occ }, avail });
    setSearching(false);
  }

  function addRoom(room: BrowseRoom, priced: PricedRoomType) {
    if (!searched) return;
    const o = searched.occ;
    const key = roomKey(room.resortId, priced.roomTypeId);
    const plan = chosenPlan[key] ?? cheapestPlan(priced);
    const price = priced.plans.find((p) => p.plan === plan) ?? priced.plans[0];
    setCart((c) => [
      ...c,
      {
        key: `${priced.roomTypeId}-${plan}-${Math.round(Math.random() * 1e6)}`,
        resortId: room.resortId,
        resortName: room.resortName,
        roomTypeId: priced.roomTypeId,
        roomTypeName: priced.roomTypeName,
        plan,
        checkIn: o.checkIn,
        checkOut: o.checkOut,
        adults: o.adults,
        children: o.children,
        childAges: o.childAges,
        extraBeds: o.extraBeds,
        nights: priced.nights,
        priceTotal: price.priceTotal,
      },
    ]);
    setNotice(`Added ${priced.roomTypeName} at ${room.resortName} to your booking.`);
  }

  const removeLine = (key: string) => setCart((c) => c.filter((l) => l.key !== key));
  const cartTotal = cart.reduce((s, l) => s + l.priceTotal, 0);
  const availableCount = searched ? visibleRooms.filter((r) => searched.avail[roomKey(r.resortId, r.roomTypeId)]).length : 0;

  async function confirmGroup() {
    setError(null);
    setBusy(true);
    try {
      const guestPayload = { name: guest.name, phone: guest.phone, email: guest.email, idType: guest.idType || undefined, idNumber: guest.idNumber || undefined };
      const res = await bookingApi.createGroupBooking(
        cart.map((l) => ({ resortId: l.resortId, roomTypeId: l.roomTypeId, checkIn: l.checkIn, checkOut: l.checkOut, guests: l.adults + l.children, adults: l.adults, children: l.children, childAges: l.childAges.length ? l.childAges : undefined, extraBeds: l.extraBeds, plan: l.plan, guest: guestPayload })),
      );
      setResult(res);
      setCart([]);
      refreshAll();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }

  async function payGroup() {
    if (!result?.groupId) return;
    setBusy(true);
    try {
      const res = await bookingApi.payGroup(result.groupId);
      setResult({ groupId: result.groupId, bookings: res.bookings });
      refreshAll();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }

  function closeCheckout() {
    setCheckout(false);
    setResult(null);
    setGuest({ name: '', phone: '', email: '', idType: '', idNumber: '' });
    setError(null);
  }

  const awaitingPayment = result?.bookings.some((b) => b.state === 'AWAITING_PAYMENT');

  return (
    <AppShell>
      <PageHeader
        title="Search & Book"
        subtitle="Pick your dates, then book any available room — we confirm with AxisRooms and the B2B channel policy."
        actions={<Link to={myBookingsPath}><Button variant="secondary">My Bookings</Button></Link>}
      />

      {/* Dates + occupancy (always visible) */}
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
          <Field label="Destination">
            <Select value={destination} onChange={setDestination} options={[{ value: 'all', label: 'All destinations' }, ...destinations.map((x) => ({ value: x, label: x }))]} />
          </Field>
          <Field label="Check-in"><Input id="search-checkin" type="date" min={today} max={maxCheckIn} value={occ.checkIn} onChange={(e) => updateOcc({ checkIn: e.target.value })} /></Field>
          <Field label="Check-out"><Input type="date" min={occ.checkIn ? addDaysStr(occ.checkIn, 1) : addDaysStr(today, 1)} max={occ.checkIn ? addDaysStr(occ.checkIn, MAX_STAY_NIGHTS) : undefined} value={occ.checkOut} onChange={(e) => updateOcc({ checkOut: e.target.value })} /></Field>
          <Field label="Adults"><Input type="number" min={1} max={20} value={occ.adults} onChange={(e) => updateOcc({ adults: Number(e.target.value) })} /></Field>
          <Field label="Children"><Input type="number" min={0} max={20} value={occ.children} onChange={(e) => setChildren(Number(e.target.value))} /></Field>
          <Field label="Extra beds"><Input type="number" min={0} max={10} value={occ.extraBeds} onChange={(e) => updateOcc({ extraBeds: Number(e.target.value) })} /></Field>
          <div className="flex items-end"><Button variant="primary" type="button" disabled={searching} onClick={runSearch} className="w-full justify-center"><Icons.search className="h-4 w-4" /> {searching ? 'Checking…' : 'Show available rooms'}</Button></div>
        </div>
        {occ.children > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Child ages (drives age-band pricing)</div>
            <div className="flex flex-wrap gap-2">
              {occ.childAges.map((age, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Child {i + 1}</span>
                  <input type="number" min={0} max={17} value={age} onChange={(e) => updateOcc({ childAges: occ.childAges.map((a, j) => (j === i ? Number(e.target.value) : a)) })} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
                </div>
              ))}
            </div>
          </div>
        )}
        {dateError && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{dateError}</p>}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="w-full sm:w-72"><Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search hotel or room…" /></div>
        <div className="text-xs text-slate-400">
          {searched ? `${availableCount} of ${visibleRooms.length} rooms available · ${searched.occ.checkIn} → ${searched.occ.checkOut}` : `${visibleRooms.length} room type${visibleRooms.length === 1 ? '' : 's'} · pick dates to see availability`}
        </div>
      </div>

      {notice && <p className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</p>}

      {/* Room list (always shown; becomes bookable once dates are searched) */}
      {isLoading || searching ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white"><div className="h-28 rounded-t-xl bg-slate-100" /><div className="space-y-2 p-4"><div className="h-4 w-2/3 rounded bg-slate-100" /><div className="h-3 w-1/2 rounded bg-slate-100" /></div></div>
          ))}
        </div>
      ) : visibleRooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No room types match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 pb-24 sm:grid-cols-2 xl:grid-cols-3">
          {visibleRooms.map((r, i) => {
            const key = roomKey(r.resortId, r.roomTypeId);
            const priced = searched?.avail[key];
            const unavailable = !!searched && !priced;
            const plan = priced ? chosenPlan[key] ?? cheapestPlan(priced) : 'EP';
            const planPrice = priced?.plans.find((p) => p.plan === plan) ?? priced?.plans[0];
            return (
              <div key={key} className={`animate-fade-up overflow-hidden rounded-xl border bg-white transition ${unavailable ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:shadow-md'}`} style={{ animationDelay: `${i * 30}ms` }}>
                <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${gradientFor(r.roomTypeId)} text-blue-500`}>
                  <Icons.bookings className="h-9 w-9" />
                  <span className="absolute right-2 top-2">
                    {priced ? <Badge tone={priced.availableCount <= 3 ? 'amber' : 'green'}>{priced.availableCount} left</Badge>
                      : unavailable ? <Badge tone="red">Sold out</Badge>
                        : <Badge tone="slate">Sleeps {r.maxOccupancy}</Badge>}
                  </span>
                </div>
                <div className="p-4">
                  <div className="font-semibold text-slate-800">{r.roomTypeName}</div>
                  <div className="text-xs text-slate-400">{r.resortName} · {r.location}</div>

                  {priced ? (
                    <>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {sortedPlans(priced).map((p) => {
                          const on = p.plan === plan;
                          return (
                            <button key={p.plan} onClick={() => setChosenPlan((s) => ({ ...s, [key]: p.plan }))} className={`rounded-lg border px-2 py-1 text-left text-[11px] transition ${on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                              <div className="font-medium">{p.plan}</div>
                              <div className={on ? 'text-blue-600' : 'text-slate-400'}>{inr(p.priceTotal)}</div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div><div className="text-lg font-semibold text-slate-900">{inr(planPrice!.priceTotal)}</div><div className="text-[11px] text-slate-400">{inr(planPrice!.pricePerNight)}/night · {priced.nights} night{priced.nights === 1 ? '' : 's'}</div></div>
                        <Button variant="primary" onClick={() => addRoom(r, priced)}>+ Add room</Button>
                      </div>
                    </>
                  ) : unavailable ? (
                    <div className="mt-3 flex items-end justify-between">
                      <div className="text-xs text-slate-400">Not available for these dates.</div>
                      <Button variant="secondary" onClick={nudgeDates}>Try other dates</Button>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-end justify-between">
                      <div><div className="text-[11px] text-slate-400">from · indicative</div><div className="text-lg font-semibold text-slate-900">{inr(r.indicativePricePerNight)}</div><div className="text-[11px] text-slate-400">per night</div></div>
                      <Button variant="primary" onClick={() => (datesValid ? runSearch() : nudgeDates())}>{datesValid ? 'Check availability' : 'Select dates'}</Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart bar */}
      {cart.length > 0 && !checkout && !result && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-60">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{cart.length} room{cart.length === 1 ? '' : 's'}</span> · <span className="font-semibold text-slate-900">{inr(cartTotal)}</span>
              <span className="ml-2 hidden text-xs text-slate-400 sm:inline">aggregate credit-gate applies to the whole cart</span>
            </div>
            <Button variant="primary" onClick={() => { setError(null); setCheckout(true); }}>Review &amp; Book →</Button>
          </div>
        </div>
      )}

      {/* Checkout / confirmation modal */}
      {(checkout || result) && (
        <Modal
          title={result ? 'Booking confirmed' : `Review booking · ${cart.length} room${cart.length === 1 ? '' : 's'}`}
          onClose={closeCheckout}
          wide
          footer={
            result ? (
              <>
                <Link to={myBookingsPath}><Button variant="secondary">View My Bookings</Button></Link>
                {awaitingPayment ? (
                  <Button variant="primary" disabled={busy} onClick={payGroup}>Pay all {inr(result.bookings.reduce((s, b) => s + Number(b.agencyPrice), 0))}</Button>
                ) : (
                  <Button variant="primary" onClick={closeCheckout}>Done</Button>
                )}
              </>
            ) : (
              <>
                <Button onClick={() => setCheckout(false)}>Back</Button>
                <Button variant="primary" disabled={busy || cart.length === 0} onClick={confirmGroup}>{busy ? 'Confirming…' : `Confirm ${cart.length} room${cart.length === 1 ? '' : 's'}`}</Button>
              </>
            )
          }
        >
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {result ? (
            <div className="space-y-2">
              <div className={`rounded-lg px-3 py-2 text-sm ${awaitingPayment ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                {awaitingPayment ? 'Rooms held. Pay to confirm the whole group.' : 'All rooms confirmed and pushed to AxisRooms.'}
              </div>
              {result.bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-sm">
                  <div><div className="font-medium text-slate-800">{b.resortName} · {b.roomTypeName}</div><div className="text-xs text-slate-400">{b.ratePlan} · {b.checkIn.slice(0, 10)} → {b.checkOut.slice(0, 10)}{b.axisRoomsRef ? ` · ref ${b.axisRoomsRef}` : ''}</div></div>
                  <div className="font-medium text-slate-800">{inr(Number(b.agencyPrice))}</div>
                </div>
              ))}
              {result.groupId && <div className="text-xs text-slate-400">Group ID: <span className="font-mono text-slate-600">{result.groupId.slice(0, 8)}</span></div>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {cart.map((l) => (
                  <div key={l.key} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-sm">
                    <div>
                      <div className="font-medium text-slate-800">{l.resortName} · {l.roomTypeName}</div>
                      <div className="text-xs text-slate-400">{PLAN_LABEL[l.plan]} · {l.checkIn} → {l.checkOut} · {l.adults + l.children} guest{l.adults + l.children === 1 ? '' : 's'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-800">{inr(l.priceTotal)}</span>
                      <button onClick={() => removeLine(l.key)} className="text-xs text-slate-400 hover:text-red-600">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
                <span>Total ({cart.length} room{cart.length === 1 ? '' : 's'})</span><span>{inr(cartTotal)}</span>
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lead guest</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Name"><Input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} placeholder="Full name" /></Field>
                <Field label="Mobile"><Input value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} placeholder="+91 …" /></Field>
                <Field label="Email"><Input type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} placeholder="guest@example.com" /></Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="ID type (optional)">
                  <Select value={guest.idType} onChange={(v) => setGuest({ ...guest, idType: v })} options={[{ value: '', label: 'None' }, { value: 'Aadhaar', label: 'Aadhaar' }, { value: 'Passport', label: 'Passport' }, { value: 'Driving Licence', label: 'Driving Licence' }, { value: 'Voter ID', label: 'Voter ID' }]} />
                </Field>
                <Field label="ID number (optional)" hint="Only the last 4 digits are stored (DPDP)"><Input value={guest.idNumber} onChange={(e) => setGuest({ ...guest, idNumber: e.target.value })} placeholder="For check-in" /></Field>
              </div>
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
