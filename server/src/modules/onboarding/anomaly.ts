import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { recordAuditLogSafe } from '../audit/audit.service';

/**
 * Sliding-window event counter (pure, time injectable) — the basis for
 * anomaly detection on onboarding activity (§11). Keyed by IP; prunes events
 * outside the window on each hit.
 */
export class SlidingWindowCounter {
  private events = new Map<string, number[]>();

  /** Records a hit and returns the number of hits for `key` within `windowMs`. */
  hit(key: string, windowMs: number, now: number): number {
    const cutoff = now - windowMs;
    const times = (this.events.get(key) ?? []).filter((t) => t > cutoff);
    times.push(now);
    this.events.set(key, times);
    return times.length;
  }

  reset(): void {
    this.events.clear();
  }
}

const tracker = new SlidingWindowCounter();
const lastAlertAt = new Map<string, number>();

function maskIp(ip: string): string {
  // Keep the network portion, mask the host (privacy in logs).
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return ip.slice(0, Math.max(3, ip.length - 4)) + '***';
}

/**
 * Records an onboarding draft creation from `ip` and, if it crosses the soft
 * threshold within the window, raises an audited + logged alert (at most once
 * per window per IP). Non-blocking — the rate limiter is the hard stop.
 */
export async function checkOnboardingAnomaly(ip: string | undefined, now = Date.now()): Promise<void> {
  if (!ip) return;
  const windowMs = env.ONBOARDING_ANOMALY_WINDOW_MINUTES * 60 * 1000;
  const count = tracker.hit(ip, windowMs, now);
  if (count < env.ONBOARDING_ANOMALY_THRESHOLD) return;

  const last = lastAlertAt.get(ip) ?? 0;
  if (now - last < windowMs) return; // already alerted this window
  lastAlertAt.set(ip, now);

  logger.warn('Anomalous onboarding activity detected', { ip: maskIp(ip), count });
  await recordAuditLogSafe({
    entityType: 'Onboarding',
    entityId: maskIp(ip),
    event: 'ONBOARDING_ANOMALY_DETECTED',
    actorId: null,
    actorRole: 'SYSTEM',
    after: { count, windowMinutes: env.ONBOARDING_ANOMALY_WINDOW_MINUTES },
  });
}

/** Test-only reset of the module tracker state. */
export function __resetAnomalyState(): void {
  tracker.reset();
  lastAlertAt.clear();
}
