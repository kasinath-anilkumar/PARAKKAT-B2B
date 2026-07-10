import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { logger } from './logger';
import { verifyAccessToken } from '../modules/auth/token.service';

/**
 * Real-time layer (Socket.IO) for multi-user live updates. The server never
 * pushes data — it emits lightweight "invalidate" signals naming the topics
 * that changed; each client refetches the matching React Query keys. Scoped by
 * rooms so tenants only hear about their own data:
 *   - `admin`            — ADMIN/VERIFIER users (see all activity)
 *   - `agency:<id>`      — that agency's AGENCY/AGENT users
 *
 * NOTE: uses the in-memory adapter, so it assumes a single server instance
 * (fine for Render's single-instance services). Scaling to multiple instances
 * needs a Socket.IO adapter (Postgres/Redis) for cross-instance fan-out.
 */
let io: Server | undefined;

interface SocketData {
  role: string;
  agencyId: string | null;
}

export function initRealtime(httpServer: HttpServer): void {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    },
  });

  // Authenticate the handshake with the same access token the REST API uses.
  io.use((socket, next) => {
    try {
      const token = (socket.handshake.auth?.token ?? '') as string;
      if (!token) return next(new Error('unauthorized'));
      const payload = verifyAccessToken(token);
      (socket.data as SocketData) = { role: payload.role, agencyId: payload.agencyId };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { role, agencyId } = socket.data as SocketData;
    if (role === 'ADMIN' || role === 'VERIFIER') socket.join('admin');
    if (agencyId) socket.join(`agency:${agencyId}`);
  });

  logger.info('Realtime (Socket.IO) initialized');
}

/**
 * Signals that the named topics changed. Always reaches admins; also reaches a
 * specific agency's users when `agencyId` is given. No-op if realtime isn't
 * initialised (e.g. in tests).
 */
export function broadcast(topics: string[], opts: { agencyId?: string | null } = {}): void {
  if (!io) return;
  const payload = { topics };
  io.to('admin').emit('invalidate', payload);
  if (opts.agencyId) io.to(`agency:${opts.agencyId}`).emit('invalidate', payload);
}
