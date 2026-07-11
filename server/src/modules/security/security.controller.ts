import type { Request, Response } from 'express';
import * as securityService from './security.service';

export async function sessions(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ items: await securityService.listActiveSessions() });
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  res.status(200).json(await securityService.revokeSession(req.params.id));
}

export async function failedLogins(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ items: await securityService.recentFailedLogins() });
}

export async function policy(_req: Request, res: Response): Promise<void> {
  res.status(200).json(securityService.getSecurityPolicy());
}

export async function integrations(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ items: securityService.getIntegrationsStatus() });
}
