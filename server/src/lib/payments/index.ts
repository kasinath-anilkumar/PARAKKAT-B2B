import crypto from 'node:crypto';
import { env } from '../../config/env';
import { logger } from '../logger';

/**
 * Payment gateway (Airpay, Decision D2-a — the portal collects and posts events
 * to the CRS). The mock captures synchronously so the agent's "Pay" completes
 * in one step; a live gateway typically returns PENDING and confirms via the
 * signature-validated webhook (handled in modules/webhooks). Behind an adapter
 * like every other external system.
 */
export interface CaptureInput {
  correlationId: string;
  amount: number;
  agencyId: string;
}

export interface CaptureResult {
  gatewayRef: string;
  status: 'SUCCEEDED' | 'PENDING';
}

export interface PaymentGateway {
  capture(input: CaptureInput): Promise<CaptureResult>;
  refund(gatewayRef: string, amount: number): Promise<{ refundRef: string }>;
}

class MockPaymentGateway implements PaymentGateway {
  async capture(input: CaptureInput): Promise<CaptureResult> {
    const gatewayRef = `PAY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    logger.info('[MockPayments] captured', { correlationId: input.correlationId, amount: input.amount, gatewayRef });
    return { gatewayRef, status: 'SUCCEEDED' };
  }

  async refund(gatewayRef: string, amount: number): Promise<{ refundRef: string }> {
    const refundRef = `RFND-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    logger.info('[MockPayments] refunded', { gatewayRef, amount, refundRef });
    return { refundRef };
  }
}

class AirpayGateway implements PaymentGateway {
  async capture(_input: CaptureInput): Promise<CaptureResult> {
    throw new Error('AirpayGateway.capture is not implemented — provide Airpay contracts and set PAYMENT_PROVIDER=airpay');
  }
  async refund(_gatewayRef: string, _amount: number): Promise<{ refundRef: string }> {
    throw new Error('AirpayGateway.refund is not implemented');
  }
}

let instance: PaymentGateway | undefined;
export function getPaymentGateway(): PaymentGateway {
  if (!instance) {
    instance = env.PAYMENT_PROVIDER === 'airpay' ? new AirpayGateway() : new MockPaymentGateway();
  }
  return instance;
}

// --- Webhook signature (hex HMAC-SHA256 of the raw body) ---
export function signPaymentBody(rawBody: string | Buffer, secret = env.PAYMENT_WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifyPaymentSignature(
  rawBody: Buffer | undefined,
  signature: string | undefined,
  secret = env.PAYMENT_WEBHOOK_SECRET,
): boolean {
  if (!rawBody || !signature) return false;
  const expected = Buffer.from(signPaymentBody(rawBody, secret));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}
