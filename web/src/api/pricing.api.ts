import { httpClient } from './httpClient';

export type RatePlan = 'EP' | 'CP' | 'MAP' | 'AP';

export interface RatePlanRate {
  id: string;
  plan: RatePlan;
  baseRate: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

// v3 §2.2 — child age band: inclusive [minAge, maxAge] → per-night charge.
export interface ChildBand {
  minAge: number;
  maxAge: number;
  charge: number;
}

export interface RoomTypePricing {
  id: string;
  resortId: string;
  roomTypeId: string;
  roomTypeName: string;
  baseOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  extraAdultCharge: string;
  childCharge: string;
  extraBedCharge: string;
  childBands: ChildBand[] | null;
  active: boolean;
  ratePlans: RatePlanRate[];
}

export interface UpsertPricingInput {
  resortId: string;
  roomTypeId: string;
  roomTypeName: string;
  baseOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  extraAdultCharge: number;
  childCharge: number;
  extraBedCharge: number;
  childBands?: ChildBand[];
  rates: { plan: RatePlan; baseRate: number }[];
}

export async function listPricing(): Promise<RoomTypePricing[]> {
  return (await httpClient.get('/pricing/room-types')).data.items;
}

export async function upsertPricing(input: UpsertPricingInput): Promise<RoomTypePricing> {
  return (await httpClient.post('/pricing/room-types', input)).data;
}

export async function deletePricing(id: string): Promise<{ deleted: boolean }> {
  return (await httpClient.delete(`/pricing/room-types/${id}`)).data;
}

// --- v3 §2.4 — rate calendar (dated windows) ---
export interface RateWindow {
  id: string;
  plan: RatePlan;
  baseRate: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  active: boolean;
  resortId: string;
  roomTypeId: string;
  roomTypeName: string;
}

export interface RateCalendarInput {
  resortId: string;
  roomTypeIds: string[];
  plans: RatePlan[];
  baseRate: number;
  effectiveFrom: string;
  effectiveTo: string;
  note?: string;
}

export async function listRateCalendar(resortId?: string): Promise<RateWindow[]> {
  return (await httpClient.get('/pricing/rate-calendar', { params: resortId ? { resortId } : {} })).data.items;
}

export async function applyRateCalendar(input: RateCalendarInput): Promise<{ created: number; updated: number; skipped: string[] }> {
  return (await httpClient.post('/pricing/rate-calendar', input)).data;
}

export async function deleteRateWindow(id: string): Promise<{ deleted: boolean }> {
  return (await httpClient.delete(`/pricing/rate-calendar/${id}`)).data;
}

export const PLAN_LABEL: Record<RatePlan, string> = {
  EP: 'EP · Room only',
  CP: 'CP · Breakfast',
  MAP: 'MAP · Half board',
  AP: 'AP · Full board',
};
