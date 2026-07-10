import swaggerJsdoc from 'swagger-jsdoc';
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env';

const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'B2B Resort Booking Portal API',
      version: '0.1.0',
      description: 'Phase 1 — foundation: auth, RBAC, MFA, audit log, portal data model.',
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts'],
});

export function mountSwagger(app: Express): void {
  if (!env.SWAGGER_ENABLED) return;
  app.get('/api/docs.json', (_req, res) => res.json(spec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
}
