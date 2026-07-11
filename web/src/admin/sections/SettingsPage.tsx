import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { Button, Field, Input, PageHeader, Tabs, Toggle } from '../../components/ui/kit';
import * as adminApi from '../../api/admin.api';
import * as settingsApi from '../../api/settings.api';
import type { AllSettings } from '../../api/settings.api';
import type { TierPreset } from '../../types/admin';

export function SettingsPage() {
  const [tab, setTab] = useState('company');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const qc = useQueryClient();

  const flash = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };
  const fail = (err: unknown) => {
    setErrorMessage((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to update settings');
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // --- System settings (company / financial / booking / portal) --------------
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.getSettings });
  const [form, setForm] = useState<AllSettings | null>(null);
  useEffect(() => {
    if (settings && !form) setForm(structuredClone(settings));
  }, [settings, form]);

  const saveGroup = useMutation({
    mutationFn: ({ group }: { group: keyof AllSettings }) => settingsApi.updateSettings(group, form![group] as never),
    onSuccess: (_data, { group }) => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      flash(`${group[0].toUpperCase() + group.slice(1)} settings saved.`);
    },
    onError: fail,
  });
  const patch = <G extends keyof AllSettings>(group: G, field: keyof AllSettings[G], value: unknown) =>
    setForm((f) => (f ? { ...f, [group]: { ...f[group], [field]: value } } : f));
  const saving = (group: keyof AllSettings) => saveGroup.isPending && saveGroup.variables?.group === group;

  // --- Commercial tiers (separate store) -------------------------------------
  const { data: tiers } = useQuery({ queryKey: ['tiers'], queryFn: adminApi.listTiers });
  const [localTiers, setLocalTiers] = useState<Record<string, TierPreset> | null>(null);
  useEffect(() => {
    if (tiers && !localTiers) setLocalTiers(JSON.parse(JSON.stringify(tiers)));
  }, [tiers, localTiers]);

  const tierMutation = useMutation({
    mutationFn: () => adminApi.updateTiers(localTiers!),
    onSuccess: () => flash('Commercial tier settings updated successfully!'),
    onError: fail,
  });

  function updateTierField(tierKey: string, field: string, value: unknown) {
    if (!localTiers) return;
    const updatedTier = { ...localTiers[tierKey], [field]: value };
    if (field === 'paymentMode' && value === 'PREPAY') {
      updatedTier.creditLimit = 0;
      updatedTier.paymentTerms = 'prepaid';
    }
    if (field === 'creditLimit' || field === 'markupPct') updatedTier[field] = Number(value);
    setLocalTiers({ ...localTiers, [tierKey]: updatedTier });
  }

  const banner = (
    <>
      {successMessage && <p className="mt-3 text-xs font-medium text-green-700 bg-green-50 border border-green-200 p-2.5 rounded-lg">{successMessage}</p>}
      {errorMessage && <p className="mt-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg">{errorMessage}</p>}
    </>
  );

  return (
    <AppShell>
      <PageHeader title="System Settings" subtitle="Company profile, financial defaults, booking rules and portal controls." />
      <Tabs
        tabs={[
          { key: 'company', label: 'Company' },
          { key: 'financial', label: 'Financial' },
          { key: 'agency_tiers', label: 'Agency Tiers' },
          { key: 'booking', label: 'Booking Rules' },
          { key: 'portal', label: 'Portal' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="w-full space-y-3">
        {tab === 'company' && form && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Company Information</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Company name"><Input value={form.company.name} onChange={(e) => patch('company', 'name', e.target.value)} /></Field>
              <Field label="Support email"><Input value={form.company.email} onChange={(e) => patch('company', 'email', e.target.value)} /></Field>
              <Field label="Contact phone"><Input value={form.company.phone} onChange={(e) => patch('company', 'phone', e.target.value)} /></Field>
              <Field label="Website"><Input value={form.company.website} onChange={(e) => patch('company', 'website', e.target.value)} /></Field>
              <Field label="GSTIN" hint="Shown on invoices & vouchers"><Input value={form.company.gstin} onChange={(e) => patch('company', 'gstin', e.target.value)} /></Field>
              <Field label="Address line 1"><Input value={form.company.addressLine1} onChange={(e) => patch('company', 'addressLine1', e.target.value)} /></Field>
              <Field label="Address line 2"><Input value={form.company.addressLine2} onChange={(e) => patch('company', 'addressLine2', e.target.value)} /></Field>
            </div>
            <div className="mt-3"><Button variant="primary" disabled={saving('company')} onClick={() => saveGroup.mutate({ group: 'company' })}>{saving('company') ? 'Saving…' : 'Save changes'}</Button></div>
            <p className="mt-2 text-xs text-slate-400">These appear on generated tax invoices, vouchers and statements.</p>
            {banner}
          </div>
        )}

        {tab === 'financial' && form && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Financial Defaults</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="GST number"><Input value={form.financial.gstNumber} onChange={(e) => patch('financial', 'gstNumber', e.target.value)} /></Field>
              <Field label="Default GST rate (%)" hint="Fallback; per-room slab still applies"><Input type="number" value={form.financial.defaultGstRate} onChange={(e) => patch('financial', 'defaultGstRate', Number(e.target.value))} /></Field>
              <Field label="Currency"><Input value={form.financial.currency} onChange={(e) => patch('financial', 'currency', e.target.value)} /></Field>
              <Field label="Invoice number format" hint="Tokens: {YYYY} {YY} {MM} {RAND}"><Input value={form.financial.invoiceNumberFormat} onChange={(e) => patch('financial', 'invoiceNumberFormat', e.target.value)} /></Field>
            </div>
            <div className="mt-3"><Button variant="primary" disabled={saving('financial')} onClick={() => saveGroup.mutate({ group: 'financial' })}>{saving('financial') ? 'Saving…' : 'Save changes'}</Button></div>
            {banner}
          </div>
        )}

        {tab === 'agency_tiers' && localTiers && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-4 text-sm font-semibold text-slate-700">Agency Commercial Tiers Configuration</div>
            <div className="space-y-6">
              {Object.entries(localTiers).map(([tierKey, config]) => (
                <div key={tierKey} className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <h4 className="text-sm font-bold text-slate-800">Tier {tierKey}</h4>
                    <span className="text-xs text-slate-500 font-mono">Preset Profile</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold text-slate-600">Payment Mode</span>
                      <select
                        value={config.paymentMode}
                        onChange={(e) => updateTierField(tierKey, 'paymentMode', e.target.value)}
                        className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                      >
                        <option value="CREDIT">CREDIT</option>
                        <option value="PREPAY">PREPAY</option>
                      </select>
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold text-slate-600">Credit Limit (₹)</span>
                      <input
                        type="number"
                        disabled={config.paymentMode === 'PREPAY'}
                        value={config.paymentMode === 'PREPAY' ? 0 : config.creditLimit}
                        onChange={(e) => updateTierField(tierKey, 'creditLimit', e.target.value)}
                        className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 disabled:opacity-50 font-medium"
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold text-slate-600">Pay Later Window (Days)</span>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          disabled={config.paymentMode === 'PREPAY'}
                          value={config.paymentMode === 'PREPAY' ? 0 : (config.paymentTerms.match(/\d+/) ? Number(config.paymentTerms.match(/\d+/)?.[0] ?? 0) : 0)}
                          onChange={(e) => updateTierField(tierKey, 'paymentTerms', `net ${e.target.value}`)}
                          className="w-full rounded border border-slate-200 bg-white pl-2.5 pr-10 py-1.5 text-xs text-slate-700 disabled:opacity-50 font-medium"
                        />
                        <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-[10px] font-semibold text-slate-400">Days</span>
                      </div>
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold text-slate-600">Default Markup (%)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={config.markupPct}
                        onChange={(e) => updateTierField(tierKey, 'markupPct', e.target.value)}
                        className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-medium"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            {banner}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <Button variant="primary" disabled={tierMutation.isPending} onClick={() => tierMutation.mutate()}>
                {tierMutation.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>
        )}

        {tab === 'booking' && form && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Booking Rules</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Booking window (days ahead)" hint="Enforced at search & booking"><Input type="number" value={form.booking.bookingWindowDays} onChange={(e) => patch('booking', 'bookingWindowDays', Number(e.target.value))} /></Field>
              <Field label="Default check-in time" hint="Printed on vouchers"><Input value={form.booking.checkInTime} onChange={(e) => patch('booking', 'checkInTime', e.target.value)} /></Field>
              <Field label="Default check-out time" hint="Printed on vouchers"><Input value={form.booking.checkOutTime} onChange={(e) => patch('booking', 'checkOutTime', e.target.value)} /></Field>
            </div>
            <div className="mt-3"><Button variant="primary" disabled={saving('booking')} onClick={() => saveGroup.mutate({ group: 'booking' })}>{saving('booking') ? 'Saving…' : 'Save changes'}</Button></div>
            <p className="mt-2 text-xs text-slate-400">Cancellation charges follow the days-before-check-in policy bands configured on the server.</p>
            {banner}
          </div>
        )}

        {tab === 'portal' && form && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-700">Maintenance mode</div>
                  <div className="text-xs text-slate-400">Block agency/agent logins while you update the portal. Admins can still sign in.</div>
                </div>
                <Toggle checked={form.portal.maintenanceMode} onChange={(v) => patch('portal', 'maintenanceMode', v)} />
              </div>
              {form.portal.maintenanceMode && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Portal is in maintenance mode — only admins can sign in.
                </div>
              )}
              <div className="mt-3"><Button variant="primary" disabled={saving('portal')} onClick={() => saveGroup.mutate({ group: 'portal' })}>{saving('portal') ? 'Saving…' : 'Save maintenance state'}</Button></div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-slate-700">Legal</div>
              <div className="space-y-2.5">
                <Field label="Terms & Conditions URL"><Input value={form.portal.termsUrl} onChange={(e) => patch('portal', 'termsUrl', e.target.value)} /></Field>
                <Field label="Privacy Policy URL"><Input value={form.portal.privacyUrl} onChange={(e) => patch('portal', 'privacyUrl', e.target.value)} /></Field>
              </div>
              <div className="mt-3"><Button variant="primary" disabled={saving('portal')} onClick={() => saveGroup.mutate({ group: 'portal' })}>{saving('portal') ? 'Saving…' : 'Save changes'}</Button></div>
            </div>
            {banner}
          </div>
        )}
      </div>
    </AppShell>
  );
}
