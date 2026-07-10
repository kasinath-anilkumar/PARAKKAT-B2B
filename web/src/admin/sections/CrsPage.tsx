import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, PageHeader, Stat, type Column, type Tone } from '../../components/ui/kit';
import { Icons } from '../../components/layout/icons';
import { SYNC_STATUS, type MockSync } from '../mock';

const SYNC_TONE: Record<MockSync['status'], Tone> = { Synced: 'green', Pending: 'amber', Failed: 'red' };

export function CrsPage() {
  const [sync, setSync] = useState<MockSync[]>(SYNC_STATUS);

  const retry = (entity: string) =>
    setSync((p) => p.map((s) => (s.entity === entity ? { ...s, status: 'Synced', lastSync: '2026-07-10 09:45', records: s.records || 1840 } : s)));

  const columns: Column<MockSync>[] = [
    { header: 'Data entity', className: 'font-medium text-slate-800', render: (s) => s.entity },
    { header: 'Last sync', render: (s) => <span className="text-slate-500">{s.lastSync}</span> },
    { header: 'Records', align: 'right', render: (s) => s.records.toLocaleString('en-IN') },
    { header: 'Status', render: (s) => <Badge tone={SYNC_TONE[s.status]}>{s.status}</Badge> },
    {
      header: 'Actions',
      align: 'right',
      render: (s) =>
        s.status === 'Synced' ? <span className="text-slate-300">—</span> : <Button variant="secondary" onClick={() => retry(s.entity)}>Retry</Button>,
    },
  ];

  const failed = sync.filter((s) => s.status === 'Failed').length;

  return (
    <AppShell>
      <PageHeader
        title="CRS Synchronization"
        subtitle="AxisRooms inventory, availability, pricing and booking-status sync."
        actions={<Button variant="primary" onClick={() => setSync((p) => p.map((s) => ({ ...s, status: 'Synced', lastSync: '2026-07-10 09:45', records: s.records || 1840 })))}>Sync All</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Entities" value={sync.length} tone="blue" />
        <Stat label="Synced" value={sync.filter((s) => s.status === 'Synced').length} tone="green" />
        <Stat label="Pending" value={sync.filter((s) => s.status === 'Pending').length} tone="amber" />
        <Stat label="Failed" value={failed} tone="red" />
      </div>

      {failed > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <Icons.sync className="h-4 w-4" />
          {failed} sync {failed === 1 ? 'job has' : 'jobs have'} failed — retry below or check the AxisRooms connection.
        </div>
      )}

      <DataTable columns={columns} rows={sync} rowKey={(s) => s.entity} />
    </AppShell>
  );
}
