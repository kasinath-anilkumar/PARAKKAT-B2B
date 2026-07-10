import type { Request, Response } from 'express';
import type { ActorRole } from '@prisma/client';
import * as inventoryService from './inventory.service';

const actorOf = (req: Request) => ({ actorId: req.user!.id, actorRole: req.user!.role as ActorRole });

export async function listPolicies(_req: Request, res: Response): Promise<void> {
  res.json({ items: await inventoryService.listPolicies() });
}

export async function createPolicy(req: Request, res: Response): Promise<void> {
  res.status(201).json(await inventoryService.createPolicy(req.body, actorOf(req)));
}

export async function deletePolicy(req: Request, res: Response): Promise<void> {
  res.json(await inventoryService.deletePolicy(req.params.id, actorOf(req)));
}

export async function listAllotments(_req: Request, res: Response): Promise<void> {
  res.json({ items: await inventoryService.listAllotments() });
}

export async function createAllotment(req: Request, res: Response): Promise<void> {
  res.status(201).json(await inventoryService.createAllotment(req.body, actorOf(req)));
}

export async function deleteAllotment(req: Request, res: Response): Promise<void> {
  res.json(await inventoryService.deleteAllotment(req.params.id, actorOf(req)));
}
