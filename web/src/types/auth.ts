export type Role = 'ADMIN' | 'VERIFIER' | 'AGENCY' | 'AGENT';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  agencyId: string | null;
  mfaEnabled: boolean;
  mfaMethod: 'NONE' | 'TOTP' | 'EMAIL';
  // v3 §10.2 — true after a temporary/admin-set password until self-service change.
  mustChangePassword?: boolean;
  // Present on the /users/me profile read (not on the minimal login session user).
  name?: string | null;
  agencyName?: string | null;
  status?: 'ACTIVE' | 'SUSPENDED';
  createdAt?: string;
}

export type LoginResponse =
  | { user: AuthUser; accessToken: string }
  | { mfaRequired: true; mfaMethod: 'TOTP' | 'EMAIL'; mfaPendingToken: string }
  | { mfaSetupRequired: true; mfaPendingToken: string };
