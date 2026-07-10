import { create } from 'zustand';
import type { AuthUser } from '../types/auth';

interface AuthState {
  // Access token lives in memory only — never localStorage/sessionStorage,
  // to reduce the blast radius of an XSS bug. The refresh token lives in an
  // httpOnly cookie the frontend never touches directly.
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearSession: () => set({ accessToken: null, user: null }),
}));
