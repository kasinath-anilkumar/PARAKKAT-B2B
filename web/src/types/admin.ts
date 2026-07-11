import type { LifecycleState } from './onboarding';

export interface ApplicationListItem {
  id: string;
  legalName: string | null;
  gstin: string | null;
  isIndependent?: boolean;
  lifecycleState: LifecycleState;
  submittedAt: string | null;
  createdAt: string;
}

export interface VerificationRecord {
  id: string;
  checkType: 'GST' | 'PAN' | 'AADHAAR_EKYC' | 'BANK' | 'DOCUMENT' | 'ESIGN';
  status: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'MANUAL_REVIEW';
  providerRef: string | null;
  completedAt: string | null;
}

export interface DocumentRecord {
  id: string;
  docType: string;
  status: string;
  fileName: string | null;
  uploadedAt: string;
}

export interface CommercialConfig {
  id: string;
  tier: string;
  paymentMode: 'PREPAY' | 'CREDIT';
  creditLimit: string;
  paymentTerms: string;
  markupPct: string;
}

export interface AgencySummary {
  id: string;
  status: 'ACTIVE' | 'SUSPENDED';
  activatedAt: string | null;
  commercialConfigurations: CommercialConfig[];
}

export interface ApplicationDetail {
  id: string;
  legalName: string | null;
  gstin: string | null;
  pan: string | null;
  isIndependent?: boolean;
  repName: string | null;
  repEmail: string | null;
  repMobile: string | null;
  bankAccount: string | null;
  lifecycleState: LifecycleState;
  submittedAt: string | null;
  decision: string | null;
  decisionReason: string | null;
  verifications: VerificationRecord[];
  documents: DocumentRecord[];
  agency: AgencySummary | null;
}

export interface TierPreset {
  paymentMode: 'PREPAY' | 'CREDIT';
  creditLimit: number;
  paymentTerms: string;
  markupPct: number;
}

export interface Agency {
  id: string;
  legalName: string;
  gstin: string;
  pan: string;
  isIndependent?: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  contactEmail: string;
  contactPhone: string;
  activatedAt: string | null;
  applicationId: string | null;
  createdAt: string;
  commercialConfigurations?: CommercialConfig[];
}

export interface CreateAgencyInput {
  legalName: string;
  gstin?: string;
  pan: string;
  contactEmail: string;
  contactPhone: string;
  tier: string;
  isIndependent?: boolean;
}

export interface AgencyUser {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'VERIFIER' | 'AGENCY' | 'AGENT';
  status: 'ACTIVE' | 'SUSPENDED';
  canBook: boolean;
  canCancel: boolean;
  canModify: boolean;
  canViewReports: boolean;
  createdAt: string;
}

export interface AgencyDocument {
  id: string;
  docType: string;
  status: string;
  fileName: string | null;
  uploadedAt: string;
}

export interface AgencyStats {
  bookings: number;
  invoices: number;
  invoiced: number;
  paid: number;
  outstanding: number;
}

export interface AgencyDetail extends Agency {
  commercialConfigurations: CommercialConfig[];
  users: AgencyUser[];
  documents: AgencyDocument[];
  stats: AgencyStats;
}

export interface UpdateAgencyInput {
  legalName?: string;
  gstin?: string;
  pan?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  event: string;
  actorId: string | null;
  actorRole: string;
  correlationId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface ReportSummary {
  range: { from: string; to: string };
  totals: { revenue: number; bookings: number; outstanding: number };
  revenueByAgency: { agencyId: string; agencyName: string; bookings: number; revenue: number; outstanding: number }[];
  bookingsByResort: { resortId: string; resortName: string; bookings: number; revenue: number }[];
}
