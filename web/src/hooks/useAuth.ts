import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  return {
    isAuthenticated: Boolean(accessToken && user),
    accessToken,
    user,
    setSession,
    clearSession,
  };
}
