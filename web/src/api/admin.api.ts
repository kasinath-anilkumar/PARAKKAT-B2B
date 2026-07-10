import { httpClient } from './httpClient';
import type {
  Agency,
  ApplicationDetail,
  ApplicationListItem,
  AuditLogEntry,
  CreateAgencyInput,
  ReportSummary,
  TierPreset,
} from '../types/admin';
import type { LifecycleState } from '../types/onboarding';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listApplications(
  lifecycleState?: LifecycleState,
  page = 1,
): Promise<Paged<ApplicationListItem>> {
  const res = await httpClient.get('/applications', { params: { lifecycleState, page } });
  return res.data;
}

export async function getApplication(id: string): Promise<ApplicationDetail> {
  const res = await httpClient.get(`/applications/${id}`);
  return res.data;
}

export async function approve(id: string): Promise<void> {
  await httpClient.post(`/applications/${id}/approve`);
}

export async function reject(id: string, reason: string): Promise<void> {
  await httpClient.post(`/applications/${id}/reject`, { reason });
}

export async function requestResubmission(
  id: string,
  payload: { checkTypes?: string[]; documentIds?: string[]; reason: string },
): Promise<void> {
  await httpClient.post(`/applications/${id}/request-resubmission`, payload);
}

export interface CommercialOverrides {
  paymentMode?: 'PREPAY' | 'CREDIT';
  creditLimit?: number;
  paymentTerms?: string;
  markupPct?: number;
}

export async function setCommercialConfig(
  id: string,
  tier: string,
  overrides?: CommercialOverrides,
): Promise<void> {
  await httpClient.post(`/applications/${id}/commercial-config`, { tier, overrides });
}

export async function sendAgreement(id: string): Promise<{ signingUrl: string }> {
  const res = await httpClient.post(`/applications/${id}/agreement/send`);
  return res.data;
}

export async function activate(id: string): Promise<void> {
  await httpClient.post(`/applications/${id}/activate`);
}

export async function suspendAgency(agencyId: string): Promise<void> {
  await httpClient.post(`/agencies/${agencyId}/suspend`);
}

export async function reactivateAgency(agencyId: string): Promise<void> {
  await httpClient.post(`/agencies/${agencyId}/reactivate`);
}

export async function listAgencies(): Promise<Paged<Agency>> {
  const res = await httpClient.get('/agencies', { params: { pageSize: 100 } });
  return res.data;
}

export async function createAgency(input: CreateAgencyInput): Promise<Agency> {
  const res = await httpClient.post('/agencies', input);
  return res.data;
}

export async function deleteAgency(id: string): Promise<void> {
  await httpClient.delete(`/agencies/${id}`);
}

export async function listTiers(): Promise<Record<string, TierPreset>> {
  const res = await httpClient.get('/commercial/tiers');
  return res.data.tiers;
}

export interface AuditFilters {
  entityType?: string;
  event?: string;
  actorRole?: string;
  correlationId?: string;
  page?: number;
}

export async function getAuditLogs(filters: AuditFilters): Promise<Paged<AuditLogEntry>> {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const res = await httpClient.get('/audit-logs', { params });
  return res.data;
}

export async function getReportSummary(from?: string, to?: string): Promise<ReportSummary> {
  const res = await httpClient.get('/reports/summary', { params: { from, to } });
  return res.data;
}
