import type { Request, Response } from 'express';
import { ApiError } from '../../utils/apiError';
import * as catalogService from './catalog.service';

export async function resorts(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ resorts: await catalogService.listResorts() });
}

export async function availability(req: Request, res: Response): Promise<void> {
  if (!req.user!.agencyId) throw ApiError.forbidden('Only agency users can search');
  const { resortId, checkIn, checkOut, guests } = req.query as unknown as {
    resortId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  };
  const roomTypes = await catalogService.searchAvailability(
    { resortId, checkIn, checkOut, guests },
    req.user!.agencyId,
  );
  res.status(200).json({ roomTypes });
}
