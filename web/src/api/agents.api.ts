import { httpClient } from './httpClient';

export interface Agent {
  id: string;
  name: string | null;
  email: string;
  status: 'ACTIVE' | 'SUSPENDED';
  canBook: boolean;
  canCancel: boolean;
  canModify: boolean;
  canViewReports: boolean;
  agencyId: string | null;
  bookings: number;
  createdAt: string;
  agencyName?: string; // present only on the admin (all-agents) list
}

export interface Permissions {
  canBook: boolean;
  canCancel: boolean;
  canModify: boolean;
  canViewReports: boolean;
}

export async function listAgents(): Promise<Agent[]> {
  return (await httpClient.get('/agents')).data.items;
}

export async function listAllAgents(): Promise<Agent[]> {
  return (await httpClient.get('/agents/all')).data.items;
}

export interface CreateAgentInput {
  name: string;
  email: string;
  password?: string;
  agencyId?: string;
  permissions?: Partial<Permissions>;
}

export async function createAgent(input: CreateAgentInput): Promise<{ agent: Agent; tempPassword?: string }> {
  return (await httpClient.post('/agents', input)).data;
}

export async function updateAgent(id: string, input: { name?: string; permissions?: Partial<Permissions> }): Promise<Agent> {
  return (await httpClient.patch(`/agents/${id}`, input)).data;
}

export async function setAgentStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<Agent> {
  return (await httpClient.post(`/agents/${id}/status`, { status })).data;
}

export async function resetAgentPassword(id: string): Promise<{ tempPassword: string }> {
  return (await httpClient.post(`/agents/${id}/reset-password`)).data;
}

export async function forceLogoutAgent(id: string): Promise<{ ok: boolean }> {
  return (await httpClient.post(`/agents/${id}/force-logout`)).data;
}

export async function deleteAgent(id: string): Promise<{ deleted: boolean }> {
  return (await httpClient.delete(`/agents/${id}`)).data;
}
