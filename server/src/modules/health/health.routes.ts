import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../utils/asyncHandler';

export const healthRouter = Router();

/** Rejects if the promise doesn't settle within `ms` — keeps the probe from hanging. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms).unref(),
    ),
  ]);
}

/**
 * @openapi
 * /health/live:
 *   get:
 *     summary: Liveness probe — process is up
 *     tags: [Health]
 */
healthRouter.get('/live', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * @openapi
 * /health/ready:
 *   get:
 *     summary: Readiness probe — reports database reachability
 *     tags: [Health]
 */
healthRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const db = await Promise.allSettled([withTimeout(prisma.$queryRaw`SELECT 1`, 2000, 'database')]);
    const ready = db[0].status === 'fulfilled';
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ok' : 'unavailable',
      checks: { database: ready ? 'ok' : 'unavailable' },
    });
  }),
);
