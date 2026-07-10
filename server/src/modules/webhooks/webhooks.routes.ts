import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as webhooksController from './webhooks.controller';

export const webhooksRouter = Router();

/**
 * @openapi
 * /webhooks/digio:
 *   post:
 *     summary: Inbound Digio verification/eSign webhook (HMAC signature-validated, idempotent)
 *     tags: [Webhooks]
 *     description: >
 *       Public endpoint. Requires a valid x-digio-signature header (hex
 *       HMAC-SHA256 of the raw body). Unverified callbacks are rejected with
 *       no state change. Retried callbacks for an already-terminal check are
 *       ignored (idempotent).
 */
webhooksRouter.post('/digio', asyncHandler(webhooksController.handleDigioWebhook));

/**
 * @openapi
 * /webhooks/payment:
 *   post:
 *     summary: Inbound payment gateway webhook (HMAC signature-validated, idempotent)
 *     tags: [Webhooks]
 */
webhooksRouter.post('/payment', asyncHandler(webhooksController.handlePaymentWebhook));
