import type { BookingState } from './booking';

export interface StatusCount {
  state: BookingState;
  count: number;
}

export interface AdminSeriesPoint {
  day: string;
  bookings: number;
  revenue: number;
}

export interface RecentBooking {
  id: string;
  resortName: string;
  roomTypeName: string;
  agencyName?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests?: number;
  state: BookingState;
  agencyPrice: number;
}

export interface AdminSummary {
  kpis: {
    totalBookings: number;
    totalRevenue: number;
    activeAgents: number;
    activeAgencies: number;
    outstandingAmount: number;
  };
  bookingsByStatus: StatusCount[];
  series: AdminSeriesPoint[];
  topResorts: { resortId: string; resortName: string; revenue: number }[];
  topAgencies: { agencyId: string; agencyName: string; bookings: number; revenue: number; outstanding: number }[];
  paymentOverview: { paid: number; pending: number; failed: number; refunded: number };
  approvals: { pendingReview: number; ekycPending: number };
  recentBookings: RecentBooking[];
}

export interface AgencySeriesPoint {
  day: string;
  bookings: number;
  spend: number;
}

export interface AgencySummary {
  kpis: {
    totalBookings: number;
    totalSpend: number;
    outstanding: number;
    creditLimit: number;
    available: number;
  };
  bookingsByStatus: StatusCount[];
  series: AgencySeriesPoint[];
  recentBookings: RecentBooking[];
}

export interface CreditNote {
  id: string;
  number: string;
  reason: string;
  taxableValue: string;
  gstRate: number;
  cgst: string;
  sgst: string;
  igst: string;
  total: string;
  irn: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  amount: string;
  // v3 §5.3 — cumulative amount settled (partial payments).
  amountPaid: string;
  paymentMode: 'PREPAY' | 'CREDIT';
  status: 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID' | 'REFUNDED';
  dueDate: string | null;
  issuedAt: string;
  // v3 §6.1 GST
  gstRate: number;
  sac: string;
  placeOfSupply: string | null;
  supplierGstin: string | null;
  recipientGstin: string | null;
  cgst: string;
  sgst: string;
  igst: string;
  invoiceTotal: string;
  irn: string | null;
  creditNotes?: CreditNote[];
}

export interface Balance {
  outstanding: number;
  creditLimit: number;
  available: number;
}
