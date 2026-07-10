# Runbook — B2B Resort Booking Portal

Operational notes for running, deploying, and troubleshooting the portal. Architecture and the
per-phase feature list are in the root `README.md`; external integrations are in
`docs/API-CONTRACTS.md`.

## Services
- **API** (`server`) — Express + Prisma, port 4000. Entry `src/server.ts` (`dist/server.js` in prod).
- **Web** (`web`) — Vite/React SPA, port 5173.
- **PostgreSQL** — system of record for portal-owned data (managed: Render/Neon/Supabase).

Notifications are delivered synchronously; the CRS outbox is flushed inline after each financial
change (no Redis/queue/worker). Async/queued delivery is a future enhancement.

**Realtime (Socket.IO):** the API pushes lightweight "invalidate" signals to connected clients so
multi-user changes appear live (JWT-authed handshake, scoped to `admin` / `agency:<id>` rooms). The
frontend connects to the API origin (`VITE_API_BASE_URL` origin, or `localhost:4000` in dev), so
CORS_ORIGIN must include the web origin. It uses the in-memory adapter → **single API instance**;
scaling to multiple instances needs a Socket.IO Postgres/Redis adapter for cross-instance fan-out.

## Local run
```bash
npm install
# Set server/.env DATABASE_URL to a managed Postgres (Render/Neon/Supabase).
npm run db:migrate --workspace server  # once
npm run db:seed    --workspace server  # admin + demo users (see README)
npm run dev:api                        # terminal 1 — API on :4000
npm run dev:web                        # terminal 2 — web on :5173
```

## Deploy (Render + Vercel)
- **Backend → Render.** `render.yaml` (repo root) provisions a managed Postgres and a Node web
  service: build the `server` workspace → `prisma migrate deploy` → `node dist/server.js`
  (health check `/api/health/live`). Set the `sync: false` secrets in the dashboard:
  `MFA_ENCRYPTION_KEY` (64 hex), `DIGIO_WEBHOOK_SECRET`, `PAYMENT_WEBHOOK_SECRET`,
  `CORS_ORIGIN` (Vercel URL), `APP_BASE_URL` (Vercel URL). Production refuses to boot with dev
  webhook-secret defaults or missing live-provider credentials (see `config/env.ts`).
- **Frontend → Vercel.** `vercel.json` (repo root) builds the `web` workspace to `web/dist` with an
  SPA rewrite. Set `VITE_API_BASE_URL` to the Render API URL.
- Persistent document storage: Render's disk is ephemeral, so use `STORAGE_PROVIDER=s3` with an
  S3-compatible bucket (Cloudflare R2 / Supabase Storage / Backblaze B2) in production.
- Set `MFA_ENFORCED=true` and switch providers to `live`/`airpay` when their credentials/contracts
  are available (see `docs/API-CONTRACTS.md`).

## Health & monitoring
- `GET /api/health/live` — liveness. `GET /api/health/ready` — database reachability.
- Logs: Winston (JSON) with a correlation id per request. Sentry/Prometheus hooks are stack choices
  in the README; wire in deploy.

## Common operations
- **Verification stuck**: an application waits in `VERIFICATION` until all Digio checks are terminal.
  Re-run: `POST /api/applications/:id/verifications/initiate`; manual override:
  `.../verifications/:checkType/override`. Drive mock results with signed webhooks (see API-CONTRACTS).
- **Activate without eSign**: not permitted — `POST /applications/:id/activate` refuses without a
  signed agreement.
- **CRS drift**: `GET /api/finance/reconciliation` reports committed-without-invoice/ref and
  pending/failed CRS events. Retry delivery: `POST /api/finance/crs/flush`.
- **Booking blocked**: if AxisRooms is down (`healthCheck` false / `AXISROOMS_FORCE_DOWN=true`),
  booking returns 503 by design — never queued. Restore AxisRooms to resume.
- **Audit review**: admins query `GET /api/audit-logs` (filters: event, entityType, actorRole,
  correlationId, date range) or the **Activity Logs** UI.
- **Abuse**: public onboarding is IP-rate-limited; sensitive authenticated actions are per-account
  limited; anomalous onboarding volume raises an audited `ONBOARDING_ANOMALY_DETECTED` event.
  Rate limiting is disabled outside production.

## Data & migrations
- Migrations in `server/prisma/migrations` (generated offline via `prisma migrate diff`; applied
  with `migrate deploy`). Never edit an applied migration — add a new one.
- The audit log is append-only (no update/delete path is exposed).
