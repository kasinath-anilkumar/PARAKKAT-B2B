import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/kit';
import { SkeletonRows } from '../components/ui/Skeleton';
import * as notificationApi from '../api/notification.api';

const fmt = (d: string) => new Date(d).toLocaleString('en-IN');

export function NotificationInbox() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: notificationApi.listNotifications });
  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
  };
  const readM = useMutation({ mutationFn: (id: string) => notificationApi.markRead(id), onSuccess: invalidate });
  const readAllM = useMutation({ mutationFn: () => notificationApi.markAllRead(), onSuccess: invalidate });

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm"><tbody><SkeletonRows rows={5} cols={2} /></tbody></table>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{unread > 0 ? `${unread} unread` : 'All caught up'}</div>
        {unread > 0 && (
          <Button variant="secondary" disabled={readAllM.isPending} onClick={() => readAllM.mutate()}>
            Mark all read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          No notifications yet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 ${n.read ? '' : 'bg-blue-50/40'} cursor-default`}
              onClick={() => { if (!n.read) readM.mutate(n.id); }}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-blue-500'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className={`truncate text-sm ${n.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{n.title}</div>
                  <div className="shrink-0 text-xs text-slate-400">{fmt(n.createdAt)}</div>
                </div>
                <div className="mt-0.5 text-sm text-slate-500">{n.body}</div>
              </div>
              {!n.read && (
                <button
                  onClick={(e) => { e.stopPropagation(); readM.mutate(n.id); }}
                  className="shrink-0 text-xs font-medium text-blue-600 hover:underline"
                >
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
