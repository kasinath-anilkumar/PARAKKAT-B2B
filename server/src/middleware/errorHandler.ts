import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/apiError';
import { logger } from '../lib/logger';
import { env } from '../config/env';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { statusCode: err.statusCode, stack: err.stack });
    }
    res.status(err.statusCode).json({
      message: err.message,
      details: err.details instanceof ZodError ? err.details.flatten() : err.details,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ message: 'A record with these details already exists' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Record not found' });
      return;
    }
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error('Unhandled error', { message, stack, path: req.originalUrl });

  res.status(500).json({
    message: env.NODE_ENV === 'production' ? 'Internal server error' : message,
  });
}
