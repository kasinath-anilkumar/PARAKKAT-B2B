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

export async function settleInvoice(id: string): Promise<Invoice> {
  const res = await httpClient.post(`/finance/invoices/${id}/settle`);
  return res.data;
}
