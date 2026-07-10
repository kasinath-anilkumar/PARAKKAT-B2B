export type Role = 'ADMIN' | 'VERIFIER' | 'AGENCY' | 'AGENT';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  agencyId: string | null;
  mfaEnabled: boolean;
  mfaMethod: 'NONE' | 'TOTP' | 'EMAIL';
}

export type LoginResponse =
  | { user: AuthUser; accessToken: string }
  | { mfaRequired: true; mfaMethod: 'TOTP' | 'EMAIL'; mfaPendingToken: string }
  | { mfaSetupRequired: true; mfaPendingToken: string };
