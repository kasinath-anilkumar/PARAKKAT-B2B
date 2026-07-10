import type { Request, Response } from 'express';
import type { ActorRole } from '@prisma/client';
import { ApiError } from '../../utils/apiError';
import type { AuthUser } from '../../types/express';
import * as agentsService from './agents.service';

function actorOf(user: AuthUser): agentsService.AgentActor {
  return {
    actorId: user.id,
    actorRole: user.role as ActorRole,
    agencyId: user.agencyId ?? null,
    isAdmin: user.role === 'ADMIN',
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  if (!user.agencyId) throw ApiError.forbidden('Only agency users can list agents');
  res.json({ items: await agentsService.listAgents(user.agencyId) });
}

export async function listAll(_req: Request, res: Response): Promise<void> {
  res.json({ items: await agentsService.listAllAgents() });
}

export async function create(req: Request, res: Response): Promise<void> {
  const result = await agentsService.createAgent(req.body, actorOf(req.user!));
  res.status(201).json(result);
}

export async function update(req: Request, res: Response): Promise<void> {
  const agent = await agentsService.updateAgent(req.params.id, req.body, actorOf(req.user!));
  res.json(agent);
}

export async function setStatus(req: Request, res: Response): Promise<void> {
  const agent = await agentsService.setAgentStatus(req.params.id, req.body.status, actorOf(req.user!));
  res.json(agent);
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  res.json(await agentsService.resetAgentPassword(req.params.id, actorOf(req.user!)));
}

export async function forceLogout(req: Request, res: Response): Promise<void> {
  res.json(await agentsService.forceLogout(req.params.id, actorOf(req.user!)));
}

export async function remove(req: Request, res: Response): Promise<void> {
  res.json(await agentsService.deleteAgent(req.params.id, actorOf(req.user!)));
}
