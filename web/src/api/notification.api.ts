import { httpClient } from './httpClient';

export interface Notification {
  id: string;
  audience: 'AGENCY' | 'ADMIN';
  agencyId: string | null;
  event: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  createdAt: string;
}

export async function listNotifications(): Promise<{ items: Notification[]; unread: number }> {
  return (await httpClient.get('/notifications')).data;
}

export async function unreadCount(): Promise<number> {
  return (await httpClient.get('/notifications/unread-count')).data.count;
}

export async function markRead(id: string): Promise<void> {
  await httpClient.post(`/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await httpClient.post('/notifications/read-all');
}

export async function broadcast(input: { subject: string; body: string; agencyIds?: string[] }): Promise<{ sent: number }> {
  return (await httpClient.post('/notifications/broadcast', input)).data;
}
