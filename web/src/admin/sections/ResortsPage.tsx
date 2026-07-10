import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, PageHeader, Tabs, inr, type Column } from '../../components/ui/kit';
import { Icons } from '../../components/layout/icons';
import { RESORTS, ROOM_TYPES, type MockResort, type MockRoomType } from '../mock';

export function ResortsPage() {
  const [tab, setTab] = useState('resorts');
  const [resorts, setResorts] = useState<MockResort[]>(RESORTS);

  const toggleArchive = (id: string) =>
    setResorts((p) => p.map((r) => (r.id === id ? { ...r, status: r.status === 'Active' ? 'Archived' : 'Active' } : r)));

  const roomCols: Column<MockRoomType>[] = [
    { header: 'Room type', className: 'font-medium text-slate-800', render: (r) => r.name },
    { header: 'Resort', render: (r) => r.resort },
    { header: 'Max occupancy', align: 'center', render: (r) => r.occupancy },
    { header: 'Meal plan', render: (r) => r.mealPlan },
    { header: 'Base rate', align: 'right', className: 'font-medium text-slate-800', render: (r) => inr(r.baseRate) },
    { header: '', align: 'right', render: () => <Button variant="ghost">Edit</Button> },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Resort Management"
        subtitle="Resort profiles, amenities, policies and room inventory."
        actions={<Button variant="primary">+ Add Resort</Button>}
      />
      <Tabs
        tabs={[
          { key: 'resorts', label: 'Resorts', count: resorts.length },
          { key: 'rooms', label: 'Room Types', count: ROOM_TYPES.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'resorts' ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {resorts.map((r) => (
            <div key={r.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-sky-100 to-blue-100 text-blue-500">
                <Icons.resorts className="h-10 w-10" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-800">{r.name}</div>
                    <div className="text-xs text-slate-400">{r.location}</div>
                  </div>
                  <Badge tone={r.status === 'Active' ? 'green' : 'slate'}>{r.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.amenities.map((a) => (
                    <span key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{a}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{r.rooms} rooms</span>
                  <span className="flex items-center gap-1 text-amber-500">★ <span className="text-slate-600">{r.rating}</span></span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" className="flex-1 justify-center">Edit</Button>
                  <Button variant={r.status === 'Active' ? 'danger' : 'secondary'} className="flex-1 justify-center" onClick={() => toggleArchive(r.id)}>
                    {r.status === 'Active' ? 'Archive' : 'Restore'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-3 flex justify-end">
            <Button variant="primary">+ Add Room Type</Button>
          </div>
          <DataTable columns={roomCols} rows={ROOM_TYPES} rowKey={(r) => r.id} />
        </div>
      )}
    </AppShell>
  );
}
