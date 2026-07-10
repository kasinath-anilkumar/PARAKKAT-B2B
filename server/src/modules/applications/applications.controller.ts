import type { Request, Response } from 'express';
import * as applicationsService from './applications.service';
import type { ListApplicationsQuery } from './applications.schema';

export async function list(req: Request, res: Response): Promise<void> {
  const { lifecycleState, page, pageSize } = req.query as unknown as ListApplicationsQuery;
  const result = await applicationsService.listApplications({ lifecycleState, page, pageSize });
  res.status(200).json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const application = await applicationsService.getApplicationDetail(req.params.id);
  res.status(200).json(application);
}
