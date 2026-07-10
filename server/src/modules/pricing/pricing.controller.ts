import type { Request, Response } from 'express';
import type { ActorRole } from '@prisma/client';
import * as pricingService from './pricing.service';

const actorOf = (req: Request) => ({ actorId: req.user!.id, actorRole: req.user!.role as ActorRole });

export async function list(_req: Request, res: Response): Promise<void> {
  res.json({ items: await pricingService.listPricingConfigs() });
}

export async function upsert(req: Request, res: Response): Promise<void> {
  res.status(201).json(await pricingService.upsertPricingConfig(req.body, actorOf(req)));
}

export async function remove(req: Request, res: Response): Promise<void> {
  res.json(await pricingService.deletePricingConfig(req.params.id, actorOf(req)));
}

// v3 §2.4 — rate calendar.
export async function listCalendar(req: Request, res: Response): Promise<void> {
  const { resortId } = req.query as { resortId?: string };
  res.json({ items: await pricingService.listRateCalendar(resortId) });
}

export async function applyCalendar(req: Request, res: Response): Promise<void> {
  res.status(201).json(await pricingService.applyRateCalendar(req.body, actorOf(req)));
}

export async function removeWindow(req: Request, res: Response): Promise<void> {
  res.json(await pricingService.deleteRateWindow(req.params.id, actorOf(req)));
}
