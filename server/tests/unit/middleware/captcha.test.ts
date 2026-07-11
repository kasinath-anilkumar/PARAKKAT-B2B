import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

// captchaGuard reads env at import, so we set the env then re-import a fresh copy
// per scenario. global.fetch (the provider's siteverify call) is stubbed.
async function loadGuard() {
  vi.resetModules();
  return (await import('../../../src/middleware/captcha')).captchaGuard;
}

function invoke(guard: (req: Request, res: Response, next: NextFunction) => void, token?: string): Promise<unknown> {
  return new Promise((resolve) => {
    const req = {
      header: (h: string) => (h.toLowerCase() === 'x-captcha-token' ? token : undefined),
      ip: '1.2.3.4',
    } as unknown as Request;
    guard(req, {} as Response, ((err?: unknown) => resolve(err)) as NextFunction);
  });
}

const statusOf = (e: unknown) => (e as { statusCode?: number })?.statusCode;

describe('captchaGuard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CAPTCHA_ENABLED;
    delete process.env.CAPTCHA_SECRET;
  });

  it('passes through when CAPTCHA is disabled (even with no token)', async () => {
    process.env.CAPTCHA_ENABLED = 'false';
    const guard = await loadGuard();
    expect(await invoke(guard, undefined)).toBeUndefined();
  });

  describe('when enabled', () => {
    const enable = () => {
      process.env.CAPTCHA_ENABLED = 'true';
      process.env.CAPTCHA_SECRET = 'test-secret';
    };

    it('rejects a missing token without calling the provider', async () => {
      enable();
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const guard = await loadGuard();
      expect(statusOf(await invoke(guard, undefined))).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('passes a token the provider verifies', async () => {
      enable();
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) })));
      const guard = await loadGuard();
      expect(await invoke(guard, 'good')).toBeUndefined();
    });

    it('rejects a token the provider fails', async () => {
      enable();
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ success: false }) })));
      const guard = await loadGuard();
      expect(statusOf(await invoke(guard, 'bad'))).toBe(400);
    });

    it('fails closed when the provider is unreachable', async () => {
      enable();
      vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
      const guard = await loadGuard();
      expect(statusOf(await invoke(guard, 'any'))).toBe(400);
    });
  });
});
