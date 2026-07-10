import { useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import {
  Badge,
  Button,
  DataTable,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Stat,
  Tabs,
  Toggle,
  Toolbar,
  inr,
  type Column,
} from '../../components/ui/kit';
import { AGENCY_AGENTS, LOGIN_HISTORY, type AgencyAgent, type AgentPermissions, type LoginEvent } from '../mock';

const PERM_LABELS: { key: keyof AgentPermissions; label: string }[] = [
  { key: 'booking', label: 'Create bookings' },
  { key: 'cancellation', label: 'Cancel bookings' },
  { key: 'modification', label: 'Modify bookings' },
  { key: 'reports', label: 'Access reports' },
];

export function AgencyAgentsPage() {
  const [tab, setTab] = useState('agents');
  const [agents, setAgents] = useState<AgencyAgent[]>(AGENCY_AGENTS);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AgencyAgent | null>(null);

  const rows = useMemo(
    () => agents.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()) || a.email.toLowerCase().includes(q.toLowerCase())),
    [agents, q],
  );

  const setStatusOf = (id: string, s: AgencyAgent['status']) => setAgents((p) => p.map((a) => (a.id === id ? { ...a, status: s } : a)));
  const savePerms = (id: string, permissions: AgentPermissions) => setAgents((p) => p.map((a) => (a.id === id ? { ...a, permissions } : a)));

  const columns: Column<AgencyAgent>[] = [
    {
      header: 'Agent',
      render: (a) => (
        <div>
          <div className="font-medium text-slate-800">{a.name}</div>
          <div className="text-xs text-slate-400">{a.email}</div>
        </div>
      ),
    },
    {
      header: 'Permissions',
      render: (a) => (
        <div className="flex flex-wrap gap-1">
          {PERM_LABELS.filter((p) => a.permissions[p.key]).map((p) => (
            <span key={p.key} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{p.label}</span>
          ))}
          {PERM_LABELS.every((p) => !a.permissions[p.key]) && <span className="text-xs text-slate-400">No permissions</span>}
        </div>
      ),
    },
    { header: 'Bookings', align: 'right', render: (a) => a.bookings },
    { header: 'Status', render: (a) => <Badge tone={a.status === 'Active' ? 'green' : 'slate'}>{a.status}</Badge> },
    {
      header: 'Actions',
      align: 'right',
      render: (a) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" onClick={() => setEditing(a)}>Permissions</Button>
          {a.status === 'Active' ? (
            <Button variant="danger" onClick={() => setStatusOf(a.id, 'Disabled')}>Disable</Button>
          ) : (
            <Button variant="secondary" onClick={() => setStatusOf(a.id, 'Active')}>Enable</Button>
          )}
        </div>
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
      <PageHeader
        title="Agent Management"
        subtitle="Manage the users under your agency, their permissions and activity."
        actions={<Button variant="primary" onClick={() => setCreating(true)}>+ Create Agent</Button>}
      />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Agents" value={agents.length} tone="blue" />
        <Stat label="Active" value={agents.filter((a) => a.status === 'Active').length} tone="green" />
        <Stat label="Bookings (all)" value={agents.reduce((s, a) => s + a.bookings, 0)} tone="violet" />
        <Stat label="Revenue (all)" value={inr(agents.reduce((s, a) => s + a.revenue, 0))} tone="sky" />
      </div>

      <Tabs
        tabs={[
          { key: 'agents', label: 'Agents', count: agents.length },
          { key: 'activity', label: 'Activity' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'agents' && (
        <>
          <Toolbar>
            <SearchInput value={q} onChange={setQ} placeholder="Search agents…" />
          </Toolbar>
          <DataTable columns={columns} rows={rows} rowKey={(a) => a.id} empty="No agents found." />
        </>
      )}

      {tab === 'activity' && (
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">Performance</div>
            <DataTable
              columns={[
                { header: 'Agent', className: 'font-medium text-slate-800', render: (a: AgencyAgent) => a.name },
                { header: 'Bookings', align: 'right', render: (a: AgencyAgent) => a.bookings },
                { header: 'Revenue', align: 'right', className: 'font-medium text-slate-800', render: (a: AgencyAgent) => inr(a.revenue) },
                { header: 'Last login', render: (a: AgencyAgent) => <span className="text-slate-500">{a.lastLogin}</span> },
              ]}
              rows={agents}
              rowKey={(a) => a.id}
            />
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">Login history</div>
            <DataTable columns={loginCols} rows={LOGIN_HISTORY} rowKey={(l) => l.id} />
          </div>
        </div>
      )}

      {creating && (
        <Modal
          title="Create Agent"
          onClose={() => setCreating(false)}
          footer={
            <>
              <Button onClick={() => setCreating(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setCreating(false)}>Create agent</Button>
            </>
          }
        >
          <div className="space-y-3">
            <Field label="Full name"><Input placeholder="e.g. Anjali Suresh" /></Field>
            <Field label="Email"><Input type="email" placeholder="agent@agency.com" /></Field>
            <p className="text-xs text-slate-400">A temporary password will be emailed to the agent on creation.</p>
          </div>
        </Modal>
      )}

      {editing && <PermissionsModal agent={editing} onClose={() => setEditing(null)} onSave={savePerms} />}
    </AppShell>
  );
}

function PermissionsModal({ agent, onClose, onSave }: { agent: AgencyAgent; onClose: () => void; onSave: (id: string, p: AgentPermissions) => void }) {
  const [perms, setPerms] = useState<AgentPermissions>(agent.permissions);
  return (
    <Modal
      title={`Permissions · ${agent.name}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSave(agent.id, perms); onClose(); }}>Save permissions</Button>
        </>
      }
    >
      <div className="space-y-3">
        {PERM_LABELS.map((p) => (
          <div key={p.key} className="flex items-center justify-between">
            <span className="text-sm text-slate-700">{p.label}</span>
            <Toggle checked={perms[p.key]} onChange={(v) => setPerms((prev) => ({ ...prev, [p.key]: v }))} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
