import type { Request, Response } from 'express';
import type { AuthUser } from '../../types/express';
import * as svc from './notification.service';

const actorOf = (u: AuthUser): svc.NotificationActor => ({
  role: u.role as svc.NotificationActor['role'],
  agencyId: u.agencyId ?? null,
});

export async function list(req: Request, res: Response): Promise<void> {
  res.status(200).json(await svc.listNotifications(actorOf(req.user!)));
}

export async function unread(req: Request, res: Response): Promise<void> {
  res.status(200).json({ count: await svc.unreadCount(actorOf(req.user!)) });
}

export async function read(req: Request, res: Response): Promise<void> {
  await svc.markRead(req.params.id, actorOf(req.user!));
  res.status(200).json({ ok: true });
}

export async function readAll(req: Request, res: Response): Promise<void> {
  await svc.markAllRead(actorOf(req.user!));
  res.status(200).json({ ok: true });
}

export async function broadcast(req: Request, res: Response): Promise<void> {
  res.status(201).json(await svc.broadcastToAgencies(req.body));
}
