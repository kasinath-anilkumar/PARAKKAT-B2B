import type { Request, Response } from 'express';
import * as usersService from './users.service';

export async function me(req: Request, res: Response): Promise<void> {
  const profile = await usersService.getUserProfile(req.user!.id);
  res.status(200).json(profile);
}
