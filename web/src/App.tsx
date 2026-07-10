import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { httpClient } from './api/httpClient';
import * as authApi from './api/auth.api';
import { useAuthStore } from './store/authStore';
import { useRealtime } from './hooks/useRealtime';
import { AppRouter } from './routes/router';

/**
 * On first load the access token only lives in memory, so a page refresh
 * loses it. Attempt a silent refresh using the httpOnly cookie before
 * rendering routes, so an already-logged-in user isn't bounced to /login.
 */
function useSessionBootstrap() {
  const [ready, setReady] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    async function bootstrap() {
      try {
        const res = await httpClient.post('/auth/refresh');
        const accessToken = res.data.accessToken as string;
        useAuthStore.getState().setAccessToken(accessToken);
        const user = await authApi.getMe();
        setSession(accessToken, user);
      } catch {
        // No valid session — user will land on /login.
      } finally {
        setReady(true);
      }
    }
    bootstrap();
  }, [setSession]);

  return ready;
}

function AppContent() {
  const ready = useSessionBootstrap();
  useRealtime(); // live multi-user updates once authenticated
  if (!ready) return null;
  return <AppRouter />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
