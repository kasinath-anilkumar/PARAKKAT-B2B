import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, Button, Field, Input, PageHeader, Tabs } from '../../components/ui/kit';

interface Doc {
  id: string;
  name: string;
  type: string;
  status: 'Verified' | 'Pending Approval';
  uploaded: string;
}
const DOCS: Doc[] = [
  { id: 'D-1', name: 'GST Certificate.pdf', type: 'GST', status: 'Verified', uploaded: '2026-01-12' },
  { id: 'D-2', name: 'PAN Card.pdf', type: 'PAN', status: 'Verified', uploaded: '2026-01-12' },
  { id: 'D-3', name: 'Agency Agreement.pdf', type: 'Agreement', status: 'Verified', uploaded: '2026-01-15' },
  { id: 'D-4', name: 'Updated Address Proof.pdf', type: 'Address', status: 'Pending Approval', uploaded: '2026-07-08' },
];

export function ProfilePage() {
  const [tab, setTab] = useState('company');

  return (
    <AppShell>
      <PageHeader title="Profile & Company" subtitle="Your company information and verification documents." />

      <Tabs
        tabs={[
          { key: 'company', label: 'Company Information' },
          { key: 'documents', label: 'Documents', count: DOCS.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'company' && (
        <div className="max-w-2xl space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Company details</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Company name"><Input defaultValue="Holiday Planners" /></Field>
              <Field label="Contact person"><Input defaultValue="Rahul Menon" /></Field>
              <Field label="Email"><Input defaultValue="admin@holidayplanners.in" /></Field>
              <Field label="Phone"><Input defaultValue="+91 98470 00000" /></Field>
              <Field label="Address"><Input defaultValue="MG Road, Kochi, Kerala 682016" /></Field>
              <Field label="Tier"><Input defaultValue="Tier A" readOnly /></Field>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Tax details</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="GST number"><Input defaultValue="32ABCDE1234F1Z5" /></Field>
              <Field label="PAN"><Input defaultValue="ABCDE1234F" /></Field>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary">Save changes</Button>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">Updated documents are reviewed by the admin before they replace the current copy.</div>
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Upload Document</span>
              <input type="file" className="hidden" />
            </label>
          </div>
          <div className="space-y-2">
            {DOCS.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div>
                  <div className="font-medium text-slate-800">{d.name}</div>
                  <div className="text-xs text-slate-400">{d.type} · uploaded {d.uploaded}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={d.status === 'Verified' ? 'green' : 'amber'}>{d.status}</Badge>
                  <Button variant="ghost">View</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
