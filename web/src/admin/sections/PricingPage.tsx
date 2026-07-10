import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Field, Input, Modal, PageHeader, Tabs, inr, type Column } from '../../components/ui/kit';
import { SkeletonRows } from '../../components/ui/Skeleton';
import * as pricingApi from '../../api/pricing.api';
import type { RatePlan, RateWindow, RoomTypePricing, UpsertPricingInput } from '../../api/pricing.api';

const PLANS: RatePlan[] = ['EP', 'CP', 'MAP', 'AP'];

// --- static tab retained for a later v3 phase (tier markups) -----------------
interface Markup { tier: string; type: string; value: string; applies: string }
const MARKUPS: Markup[] = [
  { tier: 'Tier A', type: 'Percentage', value: '8%', applies: 'All resorts' },
  { tier: 'Tier B', type: 'Percentage', value: '12%', applies: 'All resorts' },
  { tier: 'Tier C', type: 'Percentage', value: '15%', applies: 'All resorts' },
];

export function PricingPage() {
  const [tab, setTab] = useState('base');
  const qc = useQueryClient();
  const { data: configs = [], isLoading } = useQuery({ queryKey: ['pricing'], queryFn: pricingApi.listPricing });
  const { data: calendar = [] } = useQuery({ queryKey: ['rate-calendar'], queryFn: () => pricingApi.listRateCalendar() });
  const [editing, setEditing] = useState<RoomTypePricing | null>(null);
  const [creating, setCreating] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const del = useMutation({ mutationFn: pricingApi.deletePricing, onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing'] }) });
  const delWindow = useMutation({ mutationFn: pricingApi.deleteRateWindow, onSuccess: () => qc.invalidateQueries({ queryKey: ['rate-calendar'] }) });

  const rateOf = (c: RoomTypePricing, plan: RatePlan) => c.ratePlans.find((r) => r.plan === plan);

  const baseCols: Column<RoomTypePricing>[] = [
    {
      header: 'Room type',
      render: (c) => (
        <div>
          <div className="font-medium text-slate-800">{c.roomTypeName}</div>
          <div className="text-xs text-slate-400">{c.resortId} · {c.roomTypeId}</div>
        </div>
      ),
    },
    { header: 'Occupancy', render: (c) => <span className="text-slate-500">base {c.baseOccupancy} · max {c.maxOccupancy} ({c.maxAdults}A/{c.maxChildren}C)</span> },
    {
      header: 'Plan rates / night',
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {PLANS.map((p) => {
            const r = rateOf(c, p);
            return r ? <Badge key={p} tone="blue">{p} {inr(Number(r.baseRate))}</Badge> : null;
          })}
        </div>
      ),
    },
    { header: 'Extras', render: (c) => <span className="text-xs text-slate-500">+adult {inr(Number(c.extraAdultCharge))} · child {inr(Number(c.childCharge))} · bed {inr(Number(c.extraBedCharge))}</span> },
    {
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
          <Button variant="ghost" onClick={() => { if (confirm(`Delete pricing for ${c.roomTypeName}?`)) del.mutate(c.id); }}>Delete</Button>
        </div>
      ),
    },
  ];

  const markupCols: Column<Markup>[] = [
    { header: 'Tier / Agency', className: 'font-medium text-slate-800', render: (m) => m.tier },
    { header: 'Type', render: (m) => m.type },
    { header: 'Value', align: 'right', className: 'font-medium text-slate-800', render: (m) => m.value },
    { header: 'Applies to', render: (m) => m.applies },
  ];
  const fmt = (d: string | null) => (d ? d.slice(0, 10) : '—');
  const calendarCols: Column<RateWindow>[] = [
    {
      header: 'Room type',
      render: (w) => (
        <div>
          <div className="font-medium text-slate-800">{w.roomTypeName}</div>
          <div className="text-xs text-slate-400">{w.resortId} · {w.roomTypeId}</div>
        </div>
      ),
    },
    { header: 'Plan', render: (w) => <Badge tone="blue">{w.plan}</Badge> },
    { header: 'Window', render: (w) => <span className="text-slate-500">{fmt(w.effectiveFrom)} → {fmt(w.effectiveTo)}</span> },
    { header: 'Rate / night', align: 'right', className: 'font-medium text-slate-800', render: (w) => inr(Number(w.baseRate)) },
    {
      header: 'Actions',
      align: 'right',
      render: (w) => (
        <Button variant="ghost" onClick={() => { if (confirm(`Delete the ${w.plan} window ${fmt(w.effectiveFrom)}–${fmt(w.effectiveTo)} for ${w.roomTypeName}?`)) delWindow.mutate(w.id); }}>Delete</Button>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Pricing Management"
        subtitle="Portal-managed rate plans (EP/CP/MAP/AP) & occupancy pricing, tier markups and seasonal rates."
        actions={
          tab === 'base' ? (
            <Button variant="primary" onClick={() => setCreating(true)}>+ Configure Room</Button>
          ) : tab === 'seasonal' ? (
            <Button variant="primary" disabled={!configs.length} onClick={() => setCalendarOpen(true)}>+ Apply Rate Window</Button>
          ) : undefined
        }
      />
      <Tabs
        tabs={[
          { key: 'base', label: 'Base Pricing', count: configs.length },
          { key: 'markups', label: 'Markups', count: MARKUPS.length },
          { key: 'seasonal', label: 'Rate Calendar', count: calendar.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'base' &&
        (isLoading ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm"><tbody><SkeletonRows rows={5} cols={5} /></tbody></table>
          </div>
        ) : (
          <DataTable columns={baseCols} rows={configs} rowKey={(c) => c.id} empty="No room pricing configured yet." />
        ))}
      {tab === 'markups' && <DataTable columns={markupCols} rows={MARKUPS} rowKey={(m) => m.tier} />}
      {tab === 'seasonal' && (
        <>
          <p className="mb-3 text-xs text-slate-500">
            Dated rate windows override the base (default) rate for those dates. Apply one rate across many room types and
            plans at once; the booking engine automatically picks the applicable window per stay date.
          </p>
          <DataTable columns={calendarCols} rows={calendar} rowKey={(w) => w.id} empty="No dated rate windows. Base rates apply on all dates." />
        </>
      )}

      {(editing || creating) && (
        <PricingModal existing={editing} onClose={() => { setEditing(null); setCreating(false); }} />
      )}
      {calendarOpen && <RateCalendarModal configs={configs} onClose={() => setCalendarOpen(false)} />}
    </AppShell>
  );
}

function RateCalendarModal({ configs, onClose }: { configs: RoomTypePricing[]; onClose: () => void }) {
  const qc = useQueryClient();
  const resorts = useMemo(() => [...new Set(configs.map((c) => c.resortId))], [configs]);
  const [resortId, setResortId] = useState(resorts[0] ?? '');
  const [roomTypeIds, setRoomTypeIds] = useState<string[]>([]);
  const [plans, setPlans] = useState<RatePlan[]>(['EP']);
  const [baseRate, setBaseRate] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const roomsForResort = configs.filter((c) => c.resortId === resortId);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const apply = useMutation({
    mutationFn: () =>
      pricingApi.applyRateCalendar({ resortId, roomTypeIds, plans, baseRate: Number(baseRate), effectiveFrom: from, effectiveTo: to, note: note || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rate-calendar'] }); onClose(); },
    onError: (e) => setError(extractError(e)),
  });

  const valid = resortId && roomTypeIds.length > 0 && plans.length > 0 && baseRate !== '' && Number(baseRate) >= 0 && from && to && to >= from;

  return (
    <Modal
      title="Apply rate window"
      onClose={onClose}
      wide
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={apply.isPending || !valid} onClick={() => apply.mutate()}>
            {apply.isPending ? 'Applying…' : 'Apply window'}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Resort">
            <select
              value={resortId}
              onChange={(e) => { setResortId(e.target.value); setRoomTypeIds([]); }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            >
              {resorts.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Room types</div>
          <div className="flex flex-wrap gap-1.5">
            {roomsForResort.map((c) => (
              <button
                key={c.roomTypeId}
                type="button"
                onClick={() => setRoomTypeIds((l) => toggle(l, c.roomTypeId))}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${roomTypeIds.includes(c.roomTypeId) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
              >
                {c.roomTypeName}
              </button>
            ))}
            {roomsForResort.length === 0 && <span className="text-xs text-slate-400">No configured room types for this resort.</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Plans</div>
            <div className="flex flex-wrap gap-1.5">
              {PLANS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlans((l) => toggle(l, p))}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${plans.includes(p) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Field label="Rate / night (₹)"><Input type="number" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} placeholder="e.g. 8000" /></Field>
        </div>

        <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Winter peak" /></Field>
        <p className="text-xs text-slate-400">Applies the same rate to every selected room type × plan for the date range. Room types without base pricing are skipped.</p>
      </div>
    </Modal>
  );
}

function PricingModal({ existing, onClose }: { existing: RoomTypePricing | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    resortId: existing?.resortId ?? '',
    roomTypeId: existing?.roomTypeId ?? '',
    roomTypeName: existing?.roomTypeName ?? '',
    baseOccupancy: existing?.baseOccupancy ?? 2,
    maxAdults: existing?.maxAdults ?? 3,
    maxChildren: existing?.maxChildren ?? 2,
    maxOccupancy: existing?.maxOccupancy ?? 4,
    extraAdultCharge: Number(existing?.extraAdultCharge ?? 0),
    childCharge: Number(existing?.childCharge ?? 0),
    extraBedCharge: Number(existing?.extraBedCharge ?? 0),
  });
  const [rates, setRates] = useState<Record<RatePlan, string>>(() => {
    const r: Record<RatePlan, string> = { EP: '', CP: '', MAP: '', AP: '' };
    existing?.ratePlans.forEach((p) => { if (!p.effectiveFrom) r[p.plan] = String(Number(p.baseRate)); });
    return r;
  });
  // v3 §2.2 — child age bands editor.
  const [bands, setBands] = useState<{ minAge: string; maxAge: string; charge: string }[]>(
    () => (existing?.childBands ?? []).map((b) => ({ minAge: String(b.minAge), maxAge: String(b.maxAge), charge: String(b.charge) })),
  );
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const rateList = PLANS.filter((p) => rates[p] !== '' && Number(rates[p]) > 0).map((p) => ({ plan: p, baseRate: Number(rates[p]) }));
      const childBands = bands
        .filter((b) => b.minAge !== '' && b.maxAge !== '' && b.charge !== '')
        .map((b) => ({ minAge: Number(b.minAge), maxAge: Number(b.maxAge), charge: Number(b.charge) }));
      const input: UpsertPricingInput = { ...form, childBands, rates: rateList };
      return pricingApi.upsertPricing(input);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricing'] }); onClose(); },
    onError: (e) => setError(extractError(e)),
  });

  const num = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: Number(e.target.value) });
  const validRates = PLANS.some((p) => rates[p] !== '' && Number(rates[p]) > 0);

  return (
    <Modal
      title={existing ? `Edit pricing · ${existing.roomTypeName}` : 'Configure Room Pricing'}
      onClose={onClose}
      wide
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={save.isPending || !form.resortId || !form.roomTypeId || !form.roomTypeName || !validRates} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Save pricing'}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Resort ID"><Input value={form.resortId} onChange={(e) => setForm({ ...form, resortId: e.target.value })} placeholder="resort-goa" disabled={!!existing} /></Field>
          <Field label="Room type ID"><Input value={form.roomTypeId} onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })} placeholder="goa-deluxe" disabled={!!existing} /></Field>
          <Field label="Room type name"><Input value={form.roomTypeName} onChange={(e) => setForm({ ...form, roomTypeName: e.target.value })} placeholder="Deluxe Sea View" /></Field>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Occupancy</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Base occupancy"><Input type="number" value={form.baseOccupancy} onChange={num('baseOccupancy')} /></Field>
            <Field label="Max adults"><Input type="number" value={form.maxAdults} onChange={num('maxAdults')} /></Field>
            <Field label="Max children"><Input type="number" value={form.maxChildren} onChange={num('maxChildren')} /></Field>
            <Field label="Max occupancy"><Input type="number" value={form.maxOccupancy} onChange={num('maxOccupancy')} /></Field>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Occupancy charges (per night)</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Extra adult (₹)"><Input type="number" value={form.extraAdultCharge} onChange={num('extraAdultCharge')} /></Field>
            <Field label="Child — flat (₹)"><Input type="number" value={form.childCharge} onChange={num('childCharge')} /></Field>
            <Field label="Extra bed (₹)"><Input type="number" value={form.extraBedCharge} onChange={num('extraBedCharge')} /></Field>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Child age bands (per night)</span>
            <Button variant="ghost" onClick={() => setBands((b) => [...b, { minAge: '', maxAge: '', charge: '' }])}>+ Add band</Button>
          </div>
          {bands.length === 0 ? (
            <p className="text-xs text-slate-400">No age bands — the flat child charge above applies to every child. Add bands to price children by age (e.g. 0–5 free, 6–12 half-rate).</p>
          ) : (
            <div className="space-y-2">
              {bands.map((b, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                  <Field label="Min age"><Input type="number" value={b.minAge} onChange={(e) => setBands((arr) => arr.map((x, j) => (j === i ? { ...x, minAge: e.target.value } : x)))} /></Field>
                  <Field label="Max age"><Input type="number" value={b.maxAge} onChange={(e) => setBands((arr) => arr.map((x, j) => (j === i ? { ...x, maxAge: e.target.value } : x)))} /></Field>
                  <Field label="Charge (₹)"><Input type="number" value={b.charge} onChange={(e) => setBands((arr) => arr.map((x, j) => (j === i ? { ...x, charge: e.target.value } : x)))} /></Field>
                  <Button variant="ghost" onClick={() => setBands((arr) => arr.filter((_, j) => j !== i))}>Remove</Button>
                </div>
              ))}
              <p className="text-xs text-slate-400">Ages 0–17. A child with no matching band is free (e.g. infants). Bands take priority over the flat child charge.</p>
            </div>
          )}
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Rate plans — base rate / night (standard occupancy)</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PLANS.map((p) => (
              <Field key={p} label={pricingApi.PLAN_LABEL[p]}>
                <Input type="number" value={rates[p]} onChange={(e) => setRates({ ...rates, [p]: e.target.value })} placeholder="—" />
              </Field>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Leave a plan blank to not offer it. At least one plan is required.</p>
        </div>
      </div>
    </Modal>
  );
}

function extractError(err: unknown): string {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Something went wrong';
}
