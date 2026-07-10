import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, PageHeader, Tabs, inr, type Column } from '../../components/ui/kit';
import { ROOM_TYPES, type MockRoomType } from '../mock';

interface Markup {
  tier: string;
  type: string;
  value: string;
  applies: string;
}
const MARKUPS: Markup[] = [
  { tier: 'Tier A', type: 'Percentage', value: '8%', applies: 'All resorts' },
  { tier: 'Tier B', type: 'Percentage', value: '12%', applies: 'All resorts' },
  { tier: 'Tier C', type: 'Percentage', value: '15%', applies: 'All resorts' },
  { tier: 'Holiday Planners', type: 'Fixed', value: '₹500 / night', applies: 'Backwater Bliss Resort' },
];

interface Season {
  name: string;
  window: string;
  adjustment: string;
  type: 'Peak' | 'Off' | 'Weekend' | 'Festival';
}
const SEASONS: Season[] = [
  { name: 'Onam Festival', window: '25 Aug – 08 Sep', adjustment: '+25%', type: 'Festival' },
  { name: 'Monsoon Off-Season', window: '15 Jun – 31 Jul', adjustment: '-15%', type: 'Off' },
  { name: 'Winter Peak', window: '20 Dec – 10 Jan', adjustment: '+30%', type: 'Peak' },
  { name: 'Weekend Surcharge', window: 'Fri – Sun', adjustment: '+10%', type: 'Weekend' },
];

interface Promo {
  code: string;
  discount: string;
  scope: string;
  expiry: string;
  status: 'Active' | 'Scheduled' | 'Expired';
}
const PROMOS: Promo[] = [
  { code: 'MONSOON20', discount: '20%', scope: 'All agencies', expiry: '2026-07-31', status: 'Active' },
  { code: 'TIERA-FLAT', discount: '₹1,000', scope: 'Tier A only', expiry: '2026-08-15', status: 'Active' },
  { code: 'ONAM25', discount: '25%', scope: 'Selected resorts', expiry: '2026-09-08', status: 'Scheduled' },
  { code: 'SUMMER10', discount: '10%', scope: 'All agencies', expiry: '2026-06-30', status: 'Expired' },
];

export function PricingPage() {
  const [tab, setTab] = useState('base');

  const baseCols: Column<MockRoomType>[] = [
    { header: 'Room type', className: 'font-medium text-slate-800', render: (r) => r.name },
    { header: 'Resort', render: (r) => r.resort },
    { header: 'CRS base rate', align: 'right', render: (r) => inr(r.baseRate) },
    { header: 'Override', align: 'right', render: () => <span className="text-slate-400">—</span> },
    { header: '', align: 'right', render: () => <Button variant="ghost">Override</Button> },
  ];
  const markupCols: Column<Markup>[] = [
    { header: 'Tier / Agency', className: 'font-medium text-slate-800', render: (m) => m.tier },
    { header: 'Type', render: (m) => m.type },
    { header: 'Value', align: 'right', className: 'font-medium text-slate-800', render: (m) => m.value },
    { header: 'Applies to', render: (m) => m.applies },
    { header: '', align: 'right', render: () => <Button variant="ghost">Edit</Button> },
  ];
  const seasonCols: Column<Season>[] = [
    { header: 'Season', className: 'font-medium text-slate-800', render: (s) => s.name },
    { header: 'Type', render: (s) => <Badge tone={s.type === 'Peak' || s.type === 'Festival' ? 'amber' : s.type === 'Off' ? 'sky' : 'violet'}>{s.type}</Badge> },
    { header: 'Window', render: (s) => s.window },
    { header: 'Adjustment', align: 'right', className: 'font-medium text-slate-800', render: (s) => s.adjustment },
    { header: '', align: 'right', render: () => <Button variant="ghost">Edit</Button> },
  ];
  const promoCols: Column<Promo>[] = [
    { header: 'Code', className: 'font-mono text-xs font-medium text-slate-800', render: (p) => p.code },
    { header: 'Discount', render: (p) => p.discount },
    { header: 'Scope', render: (p) => p.scope },
    { header: 'Expiry', render: (p) => p.expiry },
    { header: 'Status', render: (p) => <Badge tone={p.status === 'Active' ? 'green' : p.status === 'Scheduled' ? 'blue' : 'slate'}>{p.status}</Badge> },
    { header: '', align: 'right', render: () => <Button variant="ghost">Edit</Button> },
  ];

  const addLabel =
    tab === 'base' ? null : tab === 'markups' ? '+ Add Markup' : tab === 'seasonal' ? '+ Add Season' : '+ Create Promo';

  return (
    <AppShell>
      <PageHeader
        title="Pricing Management"
        subtitle="Base rates from CRS, tier & agency markups, seasonal pricing and promotions."
        actions={addLabel ? <Button variant="primary">{addLabel}</Button> : undefined}
      />
      <Tabs
        tabs={[
          { key: 'base', label: 'Base Pricing' },
          { key: 'markups', label: 'Markups', count: MARKUPS.length },
          { key: 'seasonal', label: 'Seasonal', count: SEASONS.length },
          { key: 'promos', label: 'Promotions', count: PROMOS.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'base' && <DataTable columns={baseCols} rows={ROOM_TYPES} rowKey={(r) => r.id} />}
      {tab === 'markups' && <DataTable columns={markupCols} rows={MARKUPS} rowKey={(m) => m.tier} />}
      {tab === 'seasonal' && <DataTable columns={seasonCols} rows={SEASONS} rowKey={(s) => s.name} />}
      {tab === 'promos' && <DataTable columns={promoCols} rows={PROMOS} rowKey={(p) => p.code} />}
    </AppShell>
  );
}
