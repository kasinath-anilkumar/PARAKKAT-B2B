import type { Request, Response } from 'express';
import * as agenciesService from './agencies.service';

export async function list(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
  const result = await agenciesService.listAgencies({ page, pageSize });
  res.status(200).json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const agency = await agenciesService.getAgencyById(req.params.id);
  res.status(200).json(agency);
}

export async function suspend(req: Request, res: Response): Promise<void> {
  const agency = await agenciesService.suspendAgency(req.params.id, {
    actorId: req.user!.id,
    actorRole: req.user!.role,
  });
  res.status(200).json(agency);
}

export async function reactivate(req: Request, res: Response): Promise<void> {
  const agency = await agenciesService.reactivateAgency(req.params.id, {
    actorId: req.user!.id,
    actorRole: req.user!.role,
  });
  res.status(200).json(agency);
}

export async function create(req: Request, res: Response): Promise<void> {
  const agency = await agenciesService.createAgency(req.body, {
    actorId: req.user!.id,
    actorRole: req.user!.role,
  });
  res.status(201).json(agency);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const result = await agenciesService.deleteAgency(req.params.id, {
    actorId: req.user!.id,
    actorRole: req.user!.role,
  });
  res.status(200).json(result);
}
