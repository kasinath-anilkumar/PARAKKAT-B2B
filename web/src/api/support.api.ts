import { httpClient } from './httpClient';

export type SupportPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type SupportStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';

export interface TicketSummary {
  id: string;
  subject: string;
  category: string | null;
  priority: SupportPriority;
  status: SupportStatus;
  agencyName: string;
  createdBy: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  author: string;
  authorRole: string;
  body: string;
  internal: boolean;
  createdAt: string;
}

export interface TicketDetail extends TicketSummary {
  messages: TicketMessage[];
}

export async function listTickets(params?: { status?: SupportStatus; q?: string }): Promise<TicketSummary[]> {
  return (await httpClient.get('/support', { params })).data.items;
}

export async function getTicket(id: string): Promise<TicketDetail> {
  return (await httpClient.get(`/support/${id}`)).data;
}

export async function createTicket(input: { subject: string; category?: string; priority?: SupportPriority; body: string }): Promise<TicketDetail> {
  return (await httpClient.post('/support', input)).data;
}

export async function replyTicket(id: string, body: string, internal?: boolean): Promise<TicketDetail> {
  return (await httpClient.post(`/support/${id}/messages`, { body, internal })).data;
}

export async function setTicketStatus(id: string, status: SupportStatus): Promise<TicketDetail> {
  return (await httpClient.post(`/support/${id}/status`, { status })).data;
}
