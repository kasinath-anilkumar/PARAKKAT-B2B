import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Field, Input, PageHeader, Select, Tabs, Toggle, type Column } from '../../components/ui/kit';
import { BROADCASTS, TEMPLATES, type MockBroadcast, type MockTemplate } from '../mock';

export function NotificationsPage() {
  const [tab, setTab] = useState('broadcast');
  const [channels, setChannels] = useState({ Email: true, SMS: false, WhatsApp: true, 'In-App': true });
  const [audience, setAudience] = useState('all');

  const tplCols: Column<MockTemplate>[] = [
    { header: 'Template', className: 'font-medium text-slate-800', render: (t) => t.name },
    { header: 'Channel', render: (t) => <Badge tone="blue">{t.channel}</Badge> },
    { header: 'Last updated', render: (t) => t.updated },
    { header: '', align: 'right', render: () => <Button variant="ghost">Edit</Button> },
  ];
  const histCols: Column<MockBroadcast>[] = [
    { header: 'Subject', className: 'font-medium text-slate-800', render: (b) => b.subject },
    { header: 'Channel', render: (b) => b.channel },
    { header: 'Audience', render: (b) => b.audience },
    { header: 'Sent', render: (b) => b.sent },
    { header: 'Reach', align: 'right', render: (b) => b.reach },
  ];

  return (
    <AppShell>
      <PageHeader title="Notification Center" subtitle="Broadcast messages, manage templates and review delivery history." />
      <Tabs
        tabs={[
          { key: 'broadcast', label: 'Broadcast' },
          { key: 'templates', label: 'Templates', count: TEMPLATES.length },
          { key: 'history', label: 'History', count: BROADCASTS.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'broadcast' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="space-y-3">
                <Field label="Subject"><Input placeholder="e.g. Monsoon Special — 20% off all resorts" /></Field>
                <Field label="Message">
                  <textarea rows={6} placeholder="Write your message…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400" />
                </Field>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">Templates auto-fill subject and body.</span>
                  <Button variant="primary">Send Broadcast</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-slate-700">Channels</div>
              <div className="space-y-2.5">
                {(Object.keys(channels) as (keyof typeof channels)[]).map((c) => (
                  <div key={c} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{c}</span>
                    <Toggle checked={channels[c]} onChange={(v) => setChannels((p) => ({ ...p, [c]: v }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-slate-700">Audience</div>
              <Select
                value={audience}
                onChange={setAudience}
                options={[
                  { value: 'all', label: 'All agencies' },
                  { value: 'tierA', label: 'Tier A agencies' },
                  { value: 'tierB', label: 'Tier B agencies' },
                  { value: 'selected', label: 'Selected agencies' },
                  { value: 'agents', label: 'Individual agents' },
                ]}
              />
              <p className="mt-2 text-xs text-slate-400">Estimated reach: <span className="font-medium text-slate-600">128 recipients</span></p>
            </div>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div>
          <div className="mb-3 flex justify-end"><Button variant="primary">+ New Template</Button></div>
          <DataTable columns={tplCols} rows={TEMPLATES} rowKey={(t) => t.id} />
        </div>
      )}
      {tab === 'history' && <DataTable columns={histCols} rows={BROADCASTS} rowKey={(b) => b.id} />}
    </AppShell>
  );
}
