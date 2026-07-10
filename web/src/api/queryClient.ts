import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Always treat data as stale so every navigation/mount does a background
      // refetch — the UI stays current without a manual browser refresh. Cached
      // data still renders instantly while the refetch runs.
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});
