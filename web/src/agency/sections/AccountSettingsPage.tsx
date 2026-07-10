import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Field, Input, PageHeader, Tabs, Toggle, type Column } from '../../components/ui/kit';
import { AGENCY_SESSIONS, LOGIN_HISTORY, type AgencySession, type LoginEvent } from '../mock';

export function AccountSettingsPage() {
  const [tab, setTab] = useState('password');
  const [sessions, setSessions] = useState<AgencySession[]>(AGENCY_SESSIONS);
  const [mfa, setMfa] = useState(false);

  const sessionCols: Column<AgencySession>[] = [
    { header: 'User', className: 'font-medium text-slate-800', render: (s) => s.user },
    { header: 'IP', className: 'font-mono text-xs text-slate-600', render: (s) => s.ip },
    { header: 'Device', render: (s) => s.device },
    { header: 'Started', render: (s) => <span className="text-slate-500">{s.started}</span> },
    {
      header: 'Actions',
      align: 'right',
      render: (s) =>
        s.current ? (
          <Badge tone="green">This device</Badge>
        ) : (
          <Button variant="danger" onClick={() => setSessions((p) => p.filter((x) => x.id !== s.id))}>Revoke</Button>
        ),
    },
  ];
  const loginCols: Column<LoginEvent>[] = [
    { header: 'User', className: 'font-medium text-slate-800', render: (l) => l.user },
    { header: 'IP', className: 'font-mono text-xs text-slate-600', render: (l) => l.ip },
    { header: 'Device', render: (l) => l.device },
    { header: 'Time', render: (l) => <span className="text-slate-500">{l.time}</span> },
    { header: 'Result', render: (l) => <Badge tone={l.result === 'Success' ? 'green' : 'red'}>{l.result}</Badge> },
  ];

  return (
    <AppShell>
      <PageHeader title="Account Settings" subtitle="Password, two-factor authentication and session security." />

      <Tabs
        tabs={[
          { key: 'password', label: 'Password' },
          { key: '2fa', label: 'Two-Factor Auth' },
          { key: 'sessions', label: 'Active Sessions', count: sessions.length },
          { key: 'history', label: 'Login History' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'password' && (
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Change password</div>
          <div className="space-y-3">
            <Field label="Current password"><Input type="password" /></Field>
            <Field label="New password"><Input type="password" /></Field>
            <Field label="Confirm new password"><Input type="password" /></Field>
            <div className="pt-1"><Button variant="primary">Update password</Button></div>
          </div>
        </div>
      )}

      {tab === '2fa' && (
        <div className="max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">Two-factor authentication</div>
              <div className="text-xs text-slate-400">Add an extra layer of security using an authenticator app.</div>
            </div>
            <Toggle checked={mfa} onChange={setMfa} />
          </div>
          {mfa && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
              <div className="mb-2 flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-400">QR code</div>
              Scan with Google Authenticator, then enter the 6-digit code to finish setup.
              <div className="mt-2 flex gap-2">
                <Input placeholder="123456" className="w-28" />
                <Button variant="primary">Verify</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'sessions' && <DataTable columns={sessionCols} rows={sessions} rowKey={(s) => s.id} empty="No active sessions." />}
      {tab === 'history' && <DataTable columns={loginCols} rows={LOGIN_HISTORY} rowKey={(l) => l.id} />}
    </AppShell>
  );
}
