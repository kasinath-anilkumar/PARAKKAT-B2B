import { httpClient } from './httpClient';

export interface MyAgencyProfile {
  id: string;
  legalName: string;
  gstin: string;
  pan: string;
  isIndependent: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  contactEmail: string;
  contactPhone: string;
  activatedAt: string | null;
  createdAt: string;
  commercial: { tier: string; paymentMode: 'PREPAY' | 'CREDIT'; creditLimit: string; paymentTerms: string; markupPct: string } | null;
  documents: { id: string; docType: string; fileName: string | null; status: string; uploadedAt: string }[];
}

/** The signed-in agency's own profile, commercial terms and KYC documents. */
export async function getMyAgency(): Promise<MyAgencyProfile> {
  return (await httpClient.get('/agencies/me')).data;
}

export interface AgencyReport {
  range: { from: string; to: string };
  booking: {
    totalBookings: number;
    revenue: number;
    avgValue: number;
    cancellationRate: number;
    monthlySeries: { month: string; value: number }[];
  };
  agents: { id: string; name: string; bookings: number; revenue: number }[];
  financial: {
    paid: number;
    pending: number;
    outstanding: number;
    creditLimit: number;
    creditUsedPct: number;
    payments: { id: string; invoiceNumber: string | null; amount: number; status: string; createdAt: string }[];
  };
}

export async function getAgencyReport(): Promise<AgencyReport> {
  return (await httpClient.get('/reports/agency')).data;
}
