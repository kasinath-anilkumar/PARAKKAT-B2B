import type { Request, Response } from 'express';
import type { ActorRole } from '@prisma/client';
import { ApiError } from '../../utils/apiError';
import * as settingsService from './settings.service';
import type { SettingsGroup } from './settings.service';
import { GROUP_SCHEMAS } from './settings.schema';

export async function getSettings(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await settingsService.getAllSettings());
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const group = req.params.group as SettingsGroup;
  const parsed = GROUP_SCHEMAS[group].safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(`Invalid ${group} settings: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }
  const updated = await settingsService.updateGroup(group, parsed.data, {
    actorId: req.user!.id,
    actorRole: req.user!.role as ActorRole,
  });
  res.status(200).json(updated);
}
