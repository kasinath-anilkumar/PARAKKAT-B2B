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
  Select,
  Stat,
  Toolbar,
  type Column,
} from '../../components/ui/kit';
import { AGENTS, type MockAgent } from '../mock';

export function AgentsPage() {
  const [agents, setAgents] = useState<MockAgent[]>(AGENTS);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [creating, setCreating] = useState(false);

  const rows = useMemo(
    () =>
      agents.filter(
        (a) =>
          (status === 'all' || a.status.toLowerCase() === status) &&
          (a.name.toLowerCase().includes(q.toLowerCase()) || a.email.toLowerCase().includes(q.toLowerCase()) || a.agency.toLowerCase().includes(q.toLowerCase())),
      ),
    [agents, q, status],
  );

  const setStatusOf = (id: string, s: MockAgent['status']) => setAgents((p) => p.map((a) => (a.id === id ? { ...a, status: s } : a)));

  const columns: Column<MockAgent>[] = [
    {
      header: 'Agent',
      render: (a) => (
        <div>
          <div className="font-medium text-slate-800">{a.name}</div>
          <div className="text-xs text-slate-400">{a.email}</div>
        </div>
      ),
    },
    { header: 'Agency', render: (a) => a.agency },
    { header: 'Bookings', align: 'right', render: (a) => a.bookings.toLocaleString('en-IN') },
    { header: 'Last login', render: (a) => <span className="text-slate-500">{a.lastLogin}</span> },
    { header: 'Status', render: (a) => <Badge tone={a.status === 'Active' ? 'green' : 'slate'}>{a.status}</Badge> },
    {
      header: 'Actions',
      align: 'right',
      render: (a) => (
        <div className="flex justify-end gap-1.5">
          {a.status === 'Active' ? (
            <Button variant="danger" onClick={() => setStatusOf(a.id, 'Disabled')}>Disable</Button>
          ) : (
            <Button variant="secondary" onClick={() => setStatusOf(a.id, 'Active')}>Activate</Button>
          )}
          <Button variant="ghost" onClick={() => alert(`Password reset link sent to ${a.email}`)}>Reset password</Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Agent Management"
        subtitle="All agents across agencies — create, disable, reset credentials, and review activity."
        actions={<Button variant="primary" onClick={() => setCreating(true)}>+ Create Agent</Button>}
      />

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Agents" value={agents.length} tone="blue" />
        <Stat label="Active" value={agents.filter((a) => a.status === 'Active').length} tone="green" />
        <Stat label="Disabled" value={agents.filter((a) => a.status === 'Disabled').length} tone="slate" />
        <Stat label="Bookings (all)" value={agents.reduce((s, a) => s + a.bookings, 0).toLocaleString('en-IN')} tone="violet" />
      </div>

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search agents…" />
        <Select
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'disabled', label: 'Disabled' },
          ]}
        />
      </Toolbar>

      <DataTable columns={columns} rows={rows} rowKey={(a) => a.id} empty="No agents match your filters." />

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
            <Field label="Agency"><Input placeholder="Assign to agency" /></Field>
            <p className="text-xs text-slate-400">A temporary password will be emailed to the agent on creation.</p>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
