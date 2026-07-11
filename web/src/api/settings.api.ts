import { httpClient } from './httpClient';

export interface CompanySettings {
  name: string;
  addressLine1: string;
  addressLine2: string;
  gstin: string;
  email: string;
  phone: string;
  website: string;
}
export interface FinancialSettings {
  gstNumber: string;
  defaultGstRate: number;
  currency: string;
  invoiceNumberFormat: string;
}
export interface BookingSettings {
  bookingWindowDays: number;
  checkInTime: string;
  checkOutTime: string;
}
export interface PortalSettings {
  maintenanceMode: boolean;
  termsUrl: string;
  privacyUrl: string;
}
export interface SecuritySettings {
  mfaEnabled: boolean;
  enforceAdmin: boolean;
  enforceAgency: boolean;
  enforceAgent: boolean;
}

export interface AllSettings {
  company: CompanySettings;
  financial: FinancialSettings;
  booking: BookingSettings;
  portal: PortalSettings;
  security: SecuritySettings;
}

export async function getSettings(): Promise<AllSettings> {
  return (await httpClient.get('/settings')).data;
}

export async function updateSettings<G extends keyof AllSettings>(
  group: G,
  patch: Partial<AllSettings[G]>,
): Promise<AllSettings[G]> {
  return (await httpClient.put(`/settings/${group}`, patch)).data;
}
