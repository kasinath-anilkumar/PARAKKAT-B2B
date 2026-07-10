import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

// The socket connects directly to the API origin (not through the Vite proxy).
// In dev VITE_API_BASE_URL is empty → localhost:4000; in prod set it to the
// Render API URL and we derive its origin.
const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_ORIGIN = raw && raw.startsWith('http') ? new URL(raw).origin : 'http://localhost:4000';

// Map a backend "changed" topic → the React Query keys to invalidate. Prefixes
// match (e.g. ['applications'] covers ['applications', 'REVIEW']).
const TOPIC_KEYS: Record<string, string[][]> = {
  applications: [['applications'], ['application'], ['admin-summary']],
  agencies: [['agencies'], ['admin-summary']],
  bookings: [['bookings'], ['agency-summary'], ['admin-summary']],
  finance: [['invoices'], ['balance'], ['agency-summary'], ['admin-summary'], ['reconciliation']],
};

/**
 * Multi-user live updates: subscribes to the backend's Socket.IO "invalidate"
 * signals and refetches the affected React Query data — so changes made by any
 * user appear without a manual refresh. The server scopes events by role/agency
 * room, so a client only hears about data it's allowed to see.
 */
export function useRealtime() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;
    const socket = io(API_ORIGIN, { auth: { token: accessToken } });

    socket.on('invalidate', (msg: { topics?: string[] }) => {
      const done = new Set<string>();
      for (const topic of msg.topics ?? []) {
        for (const key of TOPIC_KEYS[topic] ?? []) {
          const id = JSON.stringify(key);
          if (done.has(id)) continue;
          done.add(id);
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, queryClient]);
}
