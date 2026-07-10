import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Field, Input, PageHeader, Tabs, Toggle, type Column, type Tone } from '../../components/ui/kit';
import { AIRPAY_TXNS, type MockTxn } from '../mock';

const TXN_TONE: Record<MockTxn['status'], Tone> = { Success: 'green', Failed: 'red', Refunded: 'violet' };

function ChannelCard({ name, provider, connected, onToggle }: { name: string; provider: string; connected: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-slate-800">{name}</div>
          <div className="text-xs text-slate-400">{provider}</div>
        </div>
        <Badge tone={connected ? 'green' : 'slate'}>{connected ? 'Connected' : 'Disabled'}</Badge>
      </div>
      <div className="mt-3 space-y-2">
        <Field label="API Key"><Input type="password" defaultValue="••••••••••••" /></Field>
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-slate-600">Enabled</span>
          <Toggle checked={connected} onChange={onToggle} />
        </div>
      </div>
    </div>
  );
}

export function IntegrationsPage() {
  const [tab, setTab] = useState('airpay');
  const [mode, setMode] = useState<'Test' | 'Live'>('Test');
  const [comm, setComm] = useState({ email: true, sms: false, whatsapp: true });

  const txnCols: Column<MockTxn>[] = [
    { header: 'Txn ID', className: 'font-mono text-xs text-slate-600', render: (t) => t.id },
    { header: 'Booking', className: 'font-mono text-xs text-slate-600', render: (t) => t.booking },
    { header: 'Gateway', render: (t) => t.gateway },
    { header: 'Amount', align: 'right', className: 'font-medium text-slate-800', render: (t) => `₹${t.amount.toLocaleString('en-IN')}` },
    { header: 'Status', render: (t) => <Badge tone={TXN_TONE[t.status]}>{t.status}</Badge> },
    { header: 'Time', render: (t) => <span className="text-slate-500">{t.time}</span> },
  ];

  return (
    <AppShell>
      <PageHeader title="Integrations" subtitle="Payment gateway and communication provider configuration." />
      <Tabs
        tabs={[
          { key: 'airpay', label: 'Airpay' },
          { key: 'communication', label: 'Communication' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'airpay' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <div className="font-medium text-slate-800">Airpay Payment Gateway</div>
              <div className="text-xs text-slate-400">Merchant ID · APX-PARAKKAT-001</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Mode</span>
              <div className="flex overflow-hidden rounded-lg border border-slate-200">
                {(['Test', 'Live'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 text-sm font-medium ${mode === m ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-slate-700">API Configuration</div>
              <div className="space-y-2.5">
                <Field label="Merchant ID"><Input defaultValue="APX-PARAKKAT-001" /></Field>
                <Field label="API Key"><Input type="password" defaultValue="••••••••••••••••" /></Field>
                <Field label="Secret"><Input type="password" defaultValue="••••••••••••••••" /></Field>
                <div className="pt-1"><Button variant="primary">Save configuration</Button></div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-slate-700">Webhook</div>
              <div className="space-y-2.5">
                <Field label="Webhook URL"><Input readOnly defaultValue="https://api.parakkat.com/api/payments/webhook" /></Field>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
                  Last event: <span className="font-medium text-slate-700">payment.success</span> · 2026-07-10 09:11 · <span className="text-green-600">200 OK</span>
                </div>
                <div className="pt-1"><Button variant="secondary">Send test event</Button></div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 mt-1 text-sm font-semibold text-slate-700">Transaction Logs</div>
            <DataTable columns={txnCols} rows={AIRPAY_TXNS} rowKey={(t) => t.id} />
          </div>
        </div>
      )}

      {tab === 'communication' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <ChannelCard name="Email" provider="Resend" connected={comm.email} onToggle={(v) => setComm((p) => ({ ...p, email: v }))} />
          <ChannelCard name="SMS" provider="MSG91" connected={comm.sms} onToggle={(v) => setComm((p) => ({ ...p, sms: v }))} />
          <ChannelCard name="WhatsApp" provider="Meta Cloud API" connected={comm.whatsapp} onToggle={(v) => setComm((p) => ({ ...p, whatsapp: v }))} />
        </div>
      )}
    </AppShell>
  );
}
