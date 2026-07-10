import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}
