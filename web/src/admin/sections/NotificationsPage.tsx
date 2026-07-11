import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { Button, Field, Input, PageHeader, Tabs } from '../../components/ui/kit';
import { NotificationInbox } from '../../shared/NotificationInbox';
import * as notificationApi from '../../api/notification.api';

export function NotificationsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('broadcast');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState<number | null>(null);

  const send = useMutation({
    mutationFn: () => notificationApi.broadcast({ subject, body }),
    onSuccess: (r) => { setSent(r.sent); setSubject(''); setBody(''); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  return (
    <AppShell>
      <PageHeader title="Notification Center" subtitle="Broadcast in-app announcements to agencies and review your own alerts." />

      <Tabs
        tabs={[
          { key: 'broadcast', label: 'Broadcast' },
          { key: 'inbox', label: 'My Notifications' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'broadcast' && (
        <div className="max-w-2xl space-y-3">
          {sent !== null && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Broadcast delivered to {sent} active agenc{sent === 1 ? 'y' : 'ies'}.
            </p>
          )}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Monsoon Special — 20% off all resorts" /></Field>
            <Field label="Message">
              <textarea
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your announcement…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
              />
            </Field>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Sends an in-app notification to every active agency&apos;s inbox.</span>
              <Button variant="primary" disabled={send.isPending || subject.trim().length < 3 || !body.trim()} onClick={() => { setSent(null); send.mutate(); }}>
                {send.isPending ? 'Sending…' : 'Send Broadcast'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'inbox' && <NotificationInbox />}
    </AppShell>
  );
}
