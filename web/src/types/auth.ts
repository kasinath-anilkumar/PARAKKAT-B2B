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
}

export type LoginResponse =
  | { user: AuthUser; accessToken: string }
  | { mfaRequired: true; mfaMethod: 'TOTP' | 'EMAIL'; mfaPendingToken: string }
  | { mfaSetupRequired: true; mfaPendingToken: string };
