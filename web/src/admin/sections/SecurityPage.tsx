import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, DataTable, Field, Input, PageHeader, Tabs, Toggle, type Column } from '../../components/ui/kit';
import { FAILED_LOGINS, SESSIONS, type MockFailedLogin, type MockSession } from '../mock';

export function SecurityPage() {
  const [tab, setTab] = useState('sessions');
  const [sessions, setSessions] = useState<MockSession[]>(SESSIONS);
  const [policy, setPolicy] = useState({ mfa: true, ipAllowlist: false, minLength: 12 });

  const sessionCols: Column<MockSession>[] = [
    { header: 'User', className: 'font-medium text-slate-800', render: (s) => s.user },
    { header: 'Role', render: (s) => <Badge tone="blue">{s.role}</Badge> },
    { header: 'IP', className: 'font-mono text-xs text-slate-600', render: (s) => s.ip },
    { header: 'Device', render: (s) => s.device },
    { header: 'Started', render: (s) => <span className="text-slate-500">{s.started}</span> },
    {
      header: 'Actions',
      align: 'right',
      render: (s) => <Button variant="danger" onClick={() => setSessions((p) => p.filter((x) => x.id !== s.id))}>Revoke</Button>,
    },
  ];

  const failedCols: Column<MockFailedLogin>[] = [
    { header: 'Email', className: 'font-medium text-slate-800', render: (f) => f.email },
    { header: 'IP', className: 'font-mono text-xs text-slate-600', render: (f) => f.ip },
    { header: 'Attempts', align: 'center', render: (f) => <Badge tone={f.attempts >= 5 ? 'red' : 'amber'}>{f.attempts}</Badge> },
    { header: 'Last attempt', render: (f) => <span className="text-slate-500">{f.lastAttempt}</span> },
    { header: 'Actions', align: 'right', render: () => <Button variant="secondary">Block IP</Button> },
  ];

  return (
    <AppShell>
      <PageHeader title="Security" subtitle="Active sessions, failed login attempts and account security policy." />
      <Tabs
        tabs={[
          { key: 'sessions', label: 'Active Sessions', count: sessions.length },
          { key: 'failed', label: 'Failed Logins', count: FAILED_LOGINS.length },
          { key: 'policy', label: 'Password & Policy' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'sessions' && <DataTable columns={sessionCols} rows={sessions} rowKey={(s) => s.id} empty="No active sessions." />}
      {tab === 'failed' && <DataTable columns={failedCols} rows={FAILED_LOGINS} rowKey={(f) => f.id} />}
      {tab === 'policy' && (
        <div className="max-w-xl space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Authentication</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-700">Enforce MFA for Admin & Verifier</div>
                  <div className="text-xs text-slate-400">Require TOTP or email OTP at login.</div>
                </div>
                <Toggle checked={policy.mfa} onChange={(v) => setPolicy((p) => ({ ...p, mfa: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-700">IP allow-list</div>
                  <div className="text-xs text-slate-400">Restrict admin access to approved IP ranges.</div>
                </div>
                <Toggle checked={policy.ipAllowlist} onChange={(v) => setPolicy((p) => ({ ...p, ipAllowlist: v }))} />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Password Policy</div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Minimum length"><Input type="number" value={policy.minLength} onChange={(e) => setPolicy((p) => ({ ...p, minLength: Number(e.target.value) }))} /></Field>
              <Field label="Rotation (days)"><Input type="number" defaultValue={90} /></Field>
            </div>
            <div className="mt-3"><Button variant="primary">Save policy</Button></div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
