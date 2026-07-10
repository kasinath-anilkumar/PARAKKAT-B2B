import { httpClient } from './httpClient';
import type { AuthUser, LoginResponse } from '../types/auth';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await httpClient.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
}

export async function verifyMfa(
  mfaPendingToken: string,
  code: string,
): Promise<{ user: AuthUser; accessToken: string }> {
  const res = await httpClient.post('/auth/mfa/verify', { mfaPendingToken, code });
  return res.data;
}

export async function setupTotp(
  mfaPendingTokenOrAccessToken: string,
): Promise<{ otpauthUrl: string; qrCodeDataUrl: string; manualEntryKey: string }> {
  const res = await httpClient.post(
    '/auth/mfa/setup/totp',
    {},
    { headers: { Authorization: `Bearer ${mfaPendingTokenOrAccessToken}` } },
  );
  return res.data;
}

export async function confirmTotp(
  mfaPendingTokenOrAccessToken: string,
  code: string,
): Promise<{ mfaEnabled: boolean; mfaMethod: string }> {
  const res = await httpClient.post(
    '/auth/mfa/setup/totp/confirm',
    { code },
    { headers: { Authorization: `Bearer ${mfaPendingTokenOrAccessToken}` } },
  );
  return res.data;
}

export async function logout(): Promise<void> {
  await httpClient.post('/auth/logout');
}

export async function getMe(): Promise<AuthUser> {
  const res = await httpClient.get<AuthUser>('/users/me');
  return res.data;
}
