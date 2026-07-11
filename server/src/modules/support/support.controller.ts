import type { Request, Response } from 'express';
import type { SupportStatus } from '@prisma/client';
import type { AuthUser } from '../../types/express';
import * as supportService from './support.service';

function actorOf(user: AuthUser): supportService.SupportActor {
  return { userId: user.id, role: user.role as 'ADMIN' | 'AGENCY' | 'AGENT', agencyId: user.agencyId ?? null };
}

export async function create(req: Request, res: Response): Promise<void> {
  res.status(201).json(await supportService.createTicket(actorOf(req.user!), req.body));
}

export async function list(req: Request, res: Response): Promise<void> {
  const { status, q } = req.query as { status?: SupportStatus; q?: string };
  res.status(200).json(await supportService.listTickets(actorOf(req.user!), { status, q }));
}

export async function getOne(req: Request, res: Response): Promise<void> {
  res.status(200).json(await supportService.getTicket(req.params.id, actorOf(req.user!)));
}

export async function reply(req: Request, res: Response): Promise<void> {
  res.status(201).json(await supportService.addMessage(req.params.id, actorOf(req.user!), req.body));
}

export async function setStatus(req: Request, res: Response): Promise<void> {
  res.status(200).json(await supportService.updateStatus(req.params.id, actorOf(req.user!), req.body.status));
}
