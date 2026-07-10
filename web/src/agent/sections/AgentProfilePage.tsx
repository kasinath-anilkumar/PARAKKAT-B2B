import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Field, Input, PageHeader, Tabs, Toggle, type Column } from '../../components/ui/kit';
import { useAuth } from '../../hooks/useAuth';
import { AGENT_LOGIN_HISTORY, AGENT_SESSIONS, type AgentSession, type LoginEvent } from '../mock';

export function AgentProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('personal');
  const [sessions, setSessions] = useState<AgentSession[]>(AGENT_SESSIONS);
  const [mfa, setMfa] = useState(false);

  const sessionCols: Column<AgentSession>[] = [
    { header: 'IP', className: 'font-mono text-xs text-slate-600', render: (s) => s.ip },
    { header: 'Device', render: (s) => s.device },
    { header: 'Started', render: (s) => <span className="text-slate-500">{s.started}</span> },
    {
      header: 'Actions',
      align: 'right',
      render: (s) => (s.current ? <Badge tone="green">This device</Badge> : <Button variant="danger" onClick={() => setSessions((p) => p.filter((x) => x.id !== s.id))}>Revoke</Button>),
    },
  ];
  const loginCols: Column<LoginEvent>[] = [
    { header: 'IP', className: 'font-mono text-xs text-slate-600', render: (l) => l.ip },
    { header: 'Device', render: (l) => l.device },
    { header: 'Time', render: (l) => <span className="text-slate-500">{l.time}</span> },
    { header: 'Result', render: (l) => <Badge tone={l.result === 'Success' ? 'green' : 'red'}>{l.result}</Badge> },
  ];

  return (
    <AppShell>
      <PageHeader title="Profile" subtitle="Your personal information and account security." />

      <Tabs
        tabs={[
          { key: 'personal', label: 'Personal Information' },
          { key: 'account', label: 'Account & Security' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'personal' && (
        <div className="max-w-xl space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-lg font-semibold text-white">
                {(user?.email ?? '?').slice(0, 2).toUpperCase()}
              </div>
              <label className="cursor-pointer">
                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Change photo</span>
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name"><Input defaultValue="Rahul Menon" /></Field>
              <Field label="Mobile number"><Input defaultValue="+91 98470 11223" /></Field>
              <Field label="Email"><Input defaultValue={user?.email ?? 'agent@agency.com'} /></Field>
              <Field label="Agency"><Input defaultValue="Holiday Planners" readOnly /></Field>
            </div>
            <div className="mt-3 flex justify-end"><Button variant="primary">Save changes</Button></div>
          </div>
        </div>
      )}

      {tab === 'account' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-slate-700">Change password</div>
              <div className="space-y-3">
                <Field label="Current password"><Input type="password" /></Field>
                <Field label="New password"><Input type="password" /></Field>
                <Field label="Confirm new password"><Input type="password" /></Field>
                <div className="pt-1"><Button variant="primary">Update password</Button></div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-700">Two-factor authentication</div>
                  <div className="text-xs text-slate-400">Protect your account with an authenticator app.</div>
                </div>
                <Toggle checked={mfa} onChange={setMfa} />
              </div>
              {mfa && (
                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                  <div className="mb-2 flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-400">QR code</div>
                  Scan, then enter the 6-digit code.
                  <div className="mt-2 flex gap-2"><Input placeholder="123456" className="w-28" /><Button variant="primary">Verify</Button></div>
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">Active sessions</div>
            <DataTable columns={sessionCols} rows={sessions} rowKey={(s) => s.id} />
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">Login history</div>
            <DataTable columns={loginCols} rows={AGENT_LOGIN_HISTORY} rowKey={(l) => l.id} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
