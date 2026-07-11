import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { PageHeader, Tabs } from '../../components/ui/kit';
import { ChangePasswordCard, MustChangePasswordBanner } from '../../shared/ChangePasswordCard';
import { MfaCard } from '../../shared/MfaCard';

export function AccountSettingsPage() {
  const [tab, setTab] = useState('password');

  return (
    <AppShell>
      <PageHeader title="Account Settings" subtitle="Password and two-factor authentication." />

      <MustChangePasswordBanner />

      <Tabs
        tabs={[
          { key: 'password', label: 'Password' },
          { key: '2fa', label: 'Two-Factor Auth' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'password' && <ChangePasswordCard />}
      {tab === '2fa' && <div className="max-w-md"><MfaCard /></div>}
    </AppShell>
  );
}
