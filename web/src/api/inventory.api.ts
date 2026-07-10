import { httpClient } from './httpClient';

export type PolicyKind = 'STOP_SELL' | 'CAP';

export interface ChannelPolicy {
  id: string;
  resortId: string;
  roomTypeId: string | null;
  kind: PolicyKind;
  startDate: string;
  endDate: string;
  capPerDay: number | null;
  note: string | null;
  createdAt: string;
}

export interface Allotment {
  id: string;
  agencyId: string;
  agency?: { legalName: string };
  resortId: string;
  roomTypeId: string;
  startDate: string;
  endDate: string;
  rooms: number;
  releaseDate: string | null;
  note: string | null;
  createdAt: string;
}

export interface CreatePolicyInput {
  resortId: string;
  roomTypeId?: string;
  kind: PolicyKind;
  startDate: string;
  endDate: string;
  capPerDay?: number;
  note?: string;
}

export interface CreateAllotmentInput {
  agencyId: string;
  resortId: string;
  roomTypeId: string;
  startDate: string;
  endDate: string;
  rooms: number;
  releaseDate?: string;
  note?: string;
}

export const listPolicies = async (): Promise<ChannelPolicy[]> => (await httpClient.get('/inventory/policies')).data.items;
export const createPolicy = async (input: CreatePolicyInput): Promise<ChannelPolicy> => (await httpClient.post('/inventory/policies', input)).data;
export const deletePolicy = async (id: string): Promise<{ deleted: boolean }> => (await httpClient.delete(`/inventory/policies/${id}`)).data;

export const listAllotments = async (): Promise<Allotment[]> => (await httpClient.get('/inventory/allotments')).data.items;
export const createAllotment = async (input: CreateAllotmentInput): Promise<Allotment> => (await httpClient.post('/inventory/allotments', input)).data;
export const deleteAllotment = async (id: string): Promise<{ deleted: boolean }> => (await httpClient.delete(`/inventory/allotments/${id}`)).data;
