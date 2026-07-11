import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { Badge, PageHeader, Tabs } from '../../components/ui/kit';
import { useAuth } from '../../hooks/useAuth';
import * as authApi from '../../api/auth.api';
import { ChangePasswordCard, MustChangePasswordBanner } from '../../shared/ChangePasswordCard';
import { MfaCard } from '../../shared/MfaCard';

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value ?? '—'}</span>
    </div>
  );
}

export function AgentProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('personal');
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.getMe });

  const profile = me ?? user;
  const initials = (profile?.name ?? profile?.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <AppShell>
      <PageHeader title="Profile" subtitle="Your personal information and account security." />

      <MustChangePasswordBanner />

      <Tabs
        tabs={[
          { key: 'personal', label: 'Personal Information' },
          { key: 'account', label: 'Account & Security' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'personal' && (
        <div className="max-w-xl">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-lg font-semibold text-white">{initials}</div>
              <div>
                <div className="text-base font-semibold text-slate-800">{profile?.name ?? '—'}</div>
                <div className="text-sm text-slate-400">{profile?.email}</div>
              </div>
            </div>
            <Row label="Full name" value={profile?.name} />
            <Row label="Email" value={profile?.email} />
            <Row label="Role" value={<Badge tone="blue">{profile?.role}</Badge>} />
            <Row label="Agency" value={me?.agencyName} />
            <Row label="Status" value={<Badge tone={me?.status === 'ACTIVE' ? 'green' : 'slate'}>{me?.status ?? 'ACTIVE'}</Badge>} />
            <Row label="Member since" value={fmtDate(me?.createdAt)} />
            <p className="mt-3 text-xs text-slate-400">Your name and agency are managed by your agency admin. Contact them to update these details.</p>
          </div>
        </div>
      )}

      {tab === 'account' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ChangePasswordCard />
          <MfaCard />
        </div>
      )}
    </AppShell>
  );
}
