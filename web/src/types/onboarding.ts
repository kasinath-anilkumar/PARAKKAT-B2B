export type LifecycleState =
  | 'DRAFT'
  | 'VERIFICATION'
  | 'REVIEW'
  | 'APPROVED'
  | 'COMMERCIAL_CONFIGURATION'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED';

export interface DraftFields {
  legalName?: string;
  gstin?: string;
  pan?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  businessContactEmail?: string;
  businessContactPhone?: string;
  repName?: string;
  repDesignation?: string;
  repEmail?: string;
  repMobile?: string;
  repAadhaarRef?: string;
  bankAccount?: string;
  ifsc?: string;
  accountHolder?: string;
  isIndependent?: boolean;
}

export interface Application extends DraftFields {
  id: string;
  lifecycleState: LifecycleState;
  submittedAt: string | null;
}

export type DocType =
  | 'REGISTRATION_PROOF'
  | 'ADDRESS_PROOF'
  | 'AGREEMENT'
  | 'SIGNED_AGREEMENT'
  | 'OTHER';

export interface DocumentSummary {
  id: string;
  docType: DocType;
  status: string;
  fileName: string | null;
  uploadedAt: string;
}

export interface ResumeSession {
  applicationId: string;
  resumeToken: string;
}
