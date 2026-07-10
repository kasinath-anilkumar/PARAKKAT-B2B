import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Button, Field, Input, PageHeader, Tabs, Toggle } from '../../components/ui/kit';

export function SettingsPage() {
  const [tab, setTab] = useState('company');
  const [maintenance, setMaintenance] = useState(false);

  return (
    <AppShell>
      <PageHeader title="System Settings" subtitle="Company profile, financial defaults, booking rules and portal controls." />
      <Tabs
        tabs={[
          { key: 'company', label: 'Company' },
          { key: 'financial', label: 'Financial' },
          { key: 'booking', label: 'Booking Rules' },
          { key: 'portal', label: 'Portal' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="max-w-2xl space-y-3">
        {tab === 'company' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Company Information</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Company name"><Input defaultValue="Parakkat Resorts & Holidays" /></Field>
              <Field label="Support email"><Input defaultValue="support@parakkatjewels.com" /></Field>
              <Field label="Contact phone"><Input defaultValue="+91 98470 00000" /></Field>
              <Field label="Website"><Input defaultValue="https://parakkat.com" /></Field>
              <Field label="Address" hint="Shown on invoices"><Input defaultValue="Kochi, Kerala, India" /></Field>
            </div>
            <div className="mt-3"><Button variant="primary">Save changes</Button></div>
          </div>
        )}

        {tab === 'financial' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Financial Defaults</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="GST number"><Input defaultValue="32ABCDE1234F1Z5" /></Field>
              <Field label="Default GST rate (%)"><Input type="number" defaultValue={18} /></Field>
              <Field label="Currency"><Input defaultValue="INR (₹)" /></Field>
              <Field label="Invoice number format" hint="e.g. INV-{YYYY}-{seq}"><Input defaultValue="INV-{YYYY}-{seq}" /></Field>
            </div>
            <div className="mt-3"><Button variant="primary">Save changes</Button></div>
          </div>
        )}

        {tab === 'booking' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Booking Rules</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Cancellation window (hours)"><Input type="number" defaultValue={48} /></Field>
              <Field label="Refund policy (%)" hint="Within window"><Input type="number" defaultValue={90} /></Field>
              <Field label="Booking window (days ahead)"><Input type="number" defaultValue={180} /></Field>
              <Field label="Default check-in / check-out"><Input defaultValue="2:00 PM / 11:00 AM" /></Field>
            </div>
            <div className="mt-3"><Button variant="primary">Save changes</Button></div>
          </div>
        )}

        {tab === 'portal' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-700">Maintenance mode</div>
                  <div className="text-xs text-slate-400">Temporarily block agency/agent logins while you update the portal.</div>
                </div>
                <Toggle checked={maintenance} onChange={setMaintenance} />
              </div>
              {maintenance && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Portal is in maintenance mode — only admins can sign in.
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-slate-700">Legal</div>
              <div className="space-y-2.5">
                <Field label="Terms & Conditions URL"><Input defaultValue="https://parakkat.com/terms" /></Field>
                <Field label="Privacy Policy URL"><Input defaultValue="https://parakkat.com/privacy" /></Field>
              </div>
              <div className="mt-3"><Button variant="primary">Save changes</Button></div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
