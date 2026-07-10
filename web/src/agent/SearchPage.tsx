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
  const [search, setSearch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<BrowseRoom | null>(null);

  // Cart / checkout
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkout, setCheckout] = useState(false);
  const [guest, setGuest] = useState({ name: '', phone: '', email: '', idType: '', idNumber: '' });
  const [result, setResult] = useState<bookingApi.GroupBookingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshAll = () => ['bookings', 'balance', 'invoices', 'agency-summary', 'agent-summary'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

  const destinations = useMemo(() => Array.from(new Set(rooms.map((r) => r.location))), [rooms]);
  const visibleRooms = useMemo(
    () =>
      rooms
        .filter((r) => destination === 'all' || r.location === destination)
        .filter((r) => [r.roomTypeName, r.resortName, r.location].some((f) => f.toLowerCase().includes(search.toLowerCase()))),
    [rooms, destination, search],
  );

  function addToCart(line: CartLine) {
    setCart((c) => [...c, line]);
    setNotice(`Added ${line.roomTypeName} at ${line.resortName} to your booking.`);
  }
  const removeLine = (key: string) => setCart((c) => c.filter((l) => l.key !== key));
  const cartTotal = cart.reduce((s, l) => s + l.priceTotal, 0);

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
        subtitle="Browse rooms across resorts, then pick your dates — we confirm availability with AxisRooms and the B2B channel policy before booking."
        actions={<Link to={myBookingsPath}><Button variant="secondary">My Bookings</Button></Link>}
      />

      {/* Browse filters (no dates required) */}
      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="w-48">
          <Field label="Destination">
            <Select value={destination} onChange={setDestination} options={[{ value: 'all', label: 'All destinations' }, ...destinations.map((x) => ({ value: x, label: x }))]} />
          </Field>
        </div>
        <div className="min-w-[16rem] flex-1">
          <Field label="Search">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search hotel or room…" />
          </Field>
        </div>
        <div className="pb-0.5 text-xs text-slate-400">{visibleRooms.length} room type{visibleRooms.length === 1 ? '' : 's'}</div>
      </div>

      {notice && <p className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white"><div className="h-28 rounded-t-xl bg-slate-100" /><div className="space-y-2 p-4"><div className="h-4 w-2/3 rounded bg-slate-100" /><div className="h-3 w-1/2 rounded bg-slate-100" /></div></div>
          ))}
        </div>
      ) : visibleRooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No room types match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 pb-24 sm:grid-cols-2 xl:grid-cols-3">
          {visibleRooms.map((r, i) => (
            <div key={`${r.resortId}-${r.roomTypeId}`} className="animate-fade-up overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md" style={{ animationDelay: `${i * 30}ms` }}>
              <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${gradientFor(r.roomTypeId)} text-blue-500`}>
                <Icons.bookings className="h-9 w-9" />
                <span className="absolute right-2 top-2"><Badge tone="slate">Sleeps {r.maxOccupancy}</Badge></span>
              </div>
              <div className="p-4">
                <div className="font-semibold text-slate-800">{r.roomTypeName}</div>
                <div className="text-xs text-slate-400">{r.resortName} · {r.location}</div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400">from · indicative</div>
                    <div className="text-lg font-semibold text-slate-900">{inr(r.indicativePricePerNight)}</div>
                    <div className="text-[11px] text-slate-400">per night</div>
                  </div>
                  <Button variant="primary" onClick={() => { setNotice(null); setSelectedRoom(r); }}>Select dates →</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Room → dates → availability check → add */}
      {selectedRoom && (
        <RoomBookingModal room={selectedRoom} onClose={() => setSelectedRoom(null)} onAdd={addToCart} />
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

/**
 * Room-first booking modal: the agent picked a room from the catalog; here they
 * choose dates + occupancy, then we verify that specific room is bookable for
 * those dates against BOTH AxisRooms (live availability) and the portal's B2B
 * channel policy (via /catalog/availability). Available → pick a plan and add;
 * unavailable → offer the rooms that ARE available at that resort/dates.
 */
function RoomBookingModal({ room, onClose, onAdd }: { room: BrowseRoom; onClose: () => void; onAdd: (line: CartLine) => void }) {
  const [occ, setOcc] = useState({ checkIn: '', checkOut: '', adults: 2, children: 0, childAges: [] as number[], extraBeds: 0 });
  const setChildren = (n: number) =>
    setOcc((d) => {
      const count = Math.max(0, Math.min(20, n));
      return { ...d, children: count, childAges: Array.from({ length: count }, (_, i) => d.childAges[i] ?? 5) };
    });

  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<PricedRoomType[]>([]);
  const [activeId, setActiveId] = useState(room.roomTypeId);
  const [chosenPlan, setChosenPlan] = useState<Record<string, RatePlan>>({});
  const [error, setError] = useState<string | null>(null);

  const datesChosen = !!occ.checkIn && !!occ.checkOut;
  const active = results.find((r) => r.roomTypeId === activeId) ?? null;
  const selectedAvailable = results.some((r) => r.roomTypeId === room.roomTypeId);

  async function check() {
    if (!datesChosen) { setError('Please choose your check-in and check-out dates.'); return; }
    setError(null);
    setChecking(true);
    setChecked(false);
    try {
      const res = await bookingApi.searchAvailability({
        resortId: room.resortId,
        checkIn: occ.checkIn,
        checkOut: occ.checkOut,
        guests: occ.adults + occ.children,
        adults: occ.adults,
        children: occ.children,
        childAges: occ.childAges,
        extraBeds: occ.extraBeds,
      });
      setResults(res);
      setActiveId(res.some((r) => r.roomTypeId === room.roomTypeId) ? room.roomTypeId : res[0]?.roomTypeId ?? '');
      setChecked(true);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setChecking(false);
    }
  }

  // Re-checking is required if the dates/occupancy change after a check.
  function onOccChange<K extends keyof typeof occ>(key: K, value: (typeof occ)[K]) {
    setOcc((d) => ({ ...d, [key]: value }));
    setChecked(false);
  }

  function add() {
    if (!active) return;
    const plan = chosenPlan[active.roomTypeId] ?? cheapestPlan(active);
    const price = active.plans.find((p) => p.plan === plan) ?? active.plans[0];
    onAdd({
      key: `${active.roomTypeId}-${plan}-${occ.checkIn}-${occ.checkOut}-${Math.round(Math.random() * 1e6)}`,
      resortId: room.resortId,
      resortName: room.resortName,
      roomTypeId: active.roomTypeId,
      roomTypeName: active.roomTypeName,
      plan,
      checkIn: occ.checkIn,
      checkOut: occ.checkOut,
      adults: occ.adults,
      children: occ.children,
      childAges: occ.childAges,
      extraBeds: occ.extraBeds,
      nights: active.nights,
      priceTotal: price.priceTotal,
    });
    onClose();
  }

  return (
    <Modal
      title={`${room.roomTypeName} · ${room.resortName}`}
      onClose={onClose}
      wide
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          {!checked ? (
            <Button variant="primary" disabled={!datesChosen || checking} onClick={check}>{checking ? 'Checking availability…' : 'Check availability'}</Button>
          ) : (
            <Button variant="primary" disabled={!active} onClick={add}>Add to booking</Button>
          )}
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="space-y-4">
        {/* Dates + occupancy */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Check-in"><Input type="date" value={occ.checkIn} onChange={(e) => onOccChange('checkIn', e.target.value)} /></Field>
          <Field label="Check-out"><Input type="date" value={occ.checkOut} onChange={(e) => onOccChange('checkOut', e.target.value)} /></Field>
          <Field label="Adults"><Input type="number" min={1} max={20} value={occ.adults} onChange={(e) => onOccChange('adults', Number(e.target.value))} /></Field>
          <Field label="Children"><Input type="number" min={0} max={20} value={occ.children} onChange={(e) => { setChildren(Number(e.target.value)); setChecked(false); }} /></Field>
          <Field label="Extra beds"><Input type="number" min={0} max={10} value={occ.extraBeds} onChange={(e) => onOccChange('extraBeds', Number(e.target.value))} /></Field>
        </div>
        {occ.children > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Child ages (drives age-band pricing)</div>
            <div className="flex flex-wrap gap-2">
              {occ.childAges.map((age, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Child {i + 1}</span>
                  <input type="number" min={0} max={17} value={age} onChange={(e) => { onOccChange('childAges', occ.childAges.map((a, j) => (j === i ? Number(e.target.value) : a))); }} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!checked && (
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            We&apos;ll confirm this room is available for your dates with AxisRooms and the B2B channel policy before you add it.
          </p>
        )}

        {/* Availability result */}
        {checked && (
          <div className="space-y-3">
            {selectedAvailable ? (
              <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">✓ Available for {occ.checkIn} → {occ.checkOut}, confirmed with AxisRooms and the channel policy.</div>
            ) : results.length > 0 ? (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{room.roomTypeName} isn&apos;t available for these dates. These rooms at {room.resortName} are — pick one:</div>
            ) : (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">No rooms are available at {room.resortName} for these dates. Try different dates or occupancy.</div>
            )}

            {results.map((rt) => {
              const on = rt.roomTypeId === activeId;
              const plan = chosenPlan[rt.roomTypeId] ?? cheapestPlan(rt);
              const planPrice = rt.plans.find((p) => p.plan === plan) ?? rt.plans[0];
              return (
                <div key={rt.roomTypeId} className={`rounded-xl border p-3 transition ${on ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200'}`}>
                  <button className="flex w-full items-center justify-between text-left" onClick={() => setActiveId(rt.roomTypeId)}>
                    <div>
                      <div className="font-semibold text-slate-800">{rt.roomTypeName}{rt.roomTypeId === room.roomTypeId ? '' : ' · alternative'}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge tone="slate">Sleeps {rt.maxOccupancy}</Badge>
                        <Badge tone={rt.availableCount <= 3 ? 'amber' : 'green'}>{rt.availableCount} left</Badge>
                      </div>
                    </div>
                    <div className="text-right"><div className="text-lg font-semibold text-slate-900">{inr(planPrice.priceTotal)}</div><div className="text-xs text-slate-400">{inr(planPrice.pricePerNight)}/night · {rt.nights} night{rt.nights === 1 ? '' : 's'}</div></div>
                  </button>
                  {on && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {sortedPlans(rt).map((p) => {
                        const sel = p.plan === plan;
                        return (
                          <button key={p.plan} onClick={() => setChosenPlan((s) => ({ ...s, [rt.roomTypeId]: p.plan }))} className={`rounded-lg border px-2.5 py-1 text-left text-xs transition ${sel ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                            <div className="font-medium">{PLAN_LABEL[p.plan]}</div>
                            <div className={sel ? 'text-blue-600' : 'text-slate-400'}>{inr(p.priceTotal)}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

function extractError(err: unknown): string {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Something went wrong';
}
