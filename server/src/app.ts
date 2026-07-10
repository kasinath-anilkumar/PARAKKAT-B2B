import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config';
import { correlationIdMiddleware } from './middleware/correlationId';
import { requestLogger } from './middleware/requestLogger';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { mountSwagger } from './lib/swagger';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { agenciesRouter } from './modules/agencies/agencies.routes';
import { agentsRouter } from './modules/agents/agents.routes';
import { pricingRouter } from './modules/pricing/pricing.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { healthRouter } from './modules/health/health.routes';
import { onboardingRouter } from './modules/onboarding/onboarding.routes';
import { applicationsRouter } from './modules/applications/applications.routes';
import { applicationActionsRouter } from './modules/applications/actions.routes';
import { verificationRouter } from './modules/verification/verification.routes';
import { commercialRouter } from './modules/commercial/commercial.routes';
import { webhooksRouter } from './modules/webhooks/webhooks.routes';
import { catalogRouter } from './modules/catalog/catalog.routes';
import { bookingRouter } from './modules/booking/booking.routes';
import { financeRouter } from './modules/finance/finance.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { reportsRouter } from './modules/reports/reports.routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  // Capture the raw body so webhook handlers can HMAC-verify the exact bytes
  // Digio signed, while the rest of the app uses the parsed JSON.
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    }),
  );
  app.use(cookieParser());
  app.use(correlationIdMiddleware);
  app.use(requestLogger);
  app.use(generalLimiter);

  mountSwagger(app);

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/commercial', commercialRouter);
  // More specific mounts first so they take precedence over /applications/:id.
  app.use('/api/applications/:id/verifications', verificationRouter);
  app.use('/api/applications/:id', applicationActionsRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/agencies', agenciesRouter);
  app.use('/api/agents', agentsRouter);
  app.use('/api/pricing', pricingRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/bookings', bookingRouter);
  app.use('/api/finance', financeRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/audit-logs', auditRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
