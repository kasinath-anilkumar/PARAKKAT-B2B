import { httpClient } from './httpClient';
import type { AdminSummary, AgencySummary, Balance, Invoice } from '../types/dashboard';

export async function getAdminSummary(): Promise<AdminSummary> {
  const res = await httpClient.get('/dashboard/admin');
  return res.data;
}

export async function getAgencySummary(): Promise<AgencySummary> {
  const res = await httpClient.get('/dashboard/agency');
  return res.data;
}

/** Agent's own overview — booking metrics scoped to the signed-in agent. */
export async function getAgentSummary(): Promise<AgencySummary> {
  const res = await httpClient.get('/dashboard/agent');
  return res.data;
}

export async function getBalance(): Promise<Balance> {
  const res = await httpClient.get('/finance/balance');
  return res.data;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listInvoices(): Promise<Paged<Invoice>> {
  const res = await httpClient.get('/finance/invoices');
  return res.data;
}

/** v3 §5.3 — settle fully (amount omitted) or partially (amount = installment). */
export async function settleInvoice(id: string, amount?: number): Promise<Invoice> {
  const res = await httpClient.post(`/finance/invoices/${id}/settle`, amount === undefined ? {} : { amount });
  return res.data;
}

export interface AdminPayment {
  id: string;
  agencyName: string;
  invoiceNumber: string | null;
  amount: number;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'CHARGEBACK';
  gatewayRef: string | null;
  createdAt: string;
  chargedBack: boolean;
}

/** v3 §5.3 — admin: recent inbound payments with settlement/chargeback state. */
export async function listPayments(): Promise<Paged<AdminPayment>> {
  const res = await httpClient.get('/finance/payments', { params: { pageSize: 100 } });
  return res.data;
}

/** v3 §5.3 — admin: record a chargeback against a settled inbound payment. */
export async function recordChargeback(id: string, reason: string): Promise<unknown> {
  const res = await httpClient.post(`/finance/payments/${id}/chargeback`, { reason });
  return res.data;
}
