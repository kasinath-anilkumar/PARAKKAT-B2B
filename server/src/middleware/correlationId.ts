import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithCorrelationId } from '../lib/correlationContext';

const HEADER = 'x-correlation-id';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER);
  const correlationId = incoming && incoming.length > 0 ? incoming : crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader(HEADER, correlationId);
  runWithCorrelationId(correlationId, next);
}
