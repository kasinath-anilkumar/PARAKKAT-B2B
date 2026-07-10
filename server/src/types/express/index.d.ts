import type { AgencyApplication, Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  role: Role;
  agencyId: string | null;
  mfaVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      correlationId?: string;
      // Set by the resume-token middleware for public onboarding routes.
      application?: AgencyApplication;
      // Raw request body bytes, captured for webhook signature verification.
      rawBody?: Buffer;
    }
  }
}

export {};
