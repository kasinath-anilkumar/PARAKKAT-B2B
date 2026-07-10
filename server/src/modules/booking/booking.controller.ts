import type { Request, Response } from 'express';
import { ApiError } from '../../utils/apiError';
import type { AuthUser } from '../../types/express';
import * as bookingService from './booking.service';

/** Every booking action is agency-scoped; the actor must belong to an agency. */
function agentActor(user: AuthUser): bookingService.AgentActor {
  if (!user.agencyId) {
    throw ApiError.forbidden('Only agency users can transact');
  }
  return { userId: user.id, agencyId: user.agencyId };
}

export async function create(req: Request, res: Response): Promise<void> {
  const booking = await bookingService.createBooking(req.body, agentActor(req.user!));
  res.status(201).json(booking);
}

export async function pay(req: Request, res: Response): Promise<void> {
  const booking = await bookingService.payBooking(req.params.id, agentActor(req.user!));
  res.status(200).json(booking);
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const booking = await bookingService.cancelBooking(req.params.id, agentActor(req.user!));
  res.status(200).json(booking);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const booking = await bookingService.getBooking(req.params.id, agentActor(req.user!));
  res.status(200).json(booking);
}

export async function list(req: Request, res: Response): Promise<void> {
  const { agencyId } = agentActor(req.user!);
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  const result = await bookingService.listBookings(agencyId, page, pageSize);
  res.status(200).json(result);
}
