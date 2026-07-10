import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalDiskStorage } from '../../../src/lib/storage/localDiskStorage';

describe('LocalDiskStorage', () => {
  const storage = new LocalDiskStorage();
  const key = `test/${Date.now()}-round-trip.txt`;

  afterEach(async () => {
    await storage.delete(key).catch(() => undefined);
  });

  it('put -> getSignedUrl -> delete round-trip', async () => {
    const result = await storage.put(key, Buffer.from('hello world'), 'text/plain');
    expect(result.storageKey).toEqual(key);

    const url = await storage.getSignedUrl(key);
    expect(url).toContain('local://');
    expect(url).toContain(key);

    await storage.delete(key);
    await expect(storage.getSignedUrl(key)).rejects.toThrow();
  });

  it('rejects path traversal in the storage key', async () => {
    await expect(storage.put('../../etc/passwd', Buffer.from('x'), 'text/plain')).rejects.toThrow(
      /path traversal/,
    );
  });
});

describe('S3Storage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws a clear error when required S3 env vars are missing', async () => {
    const { S3Storage } = await import('../../../src/lib/storage/s3Storage');
    expect(() => new S3Storage()).toThrow(/S3_BUCKET/);
  });
});
