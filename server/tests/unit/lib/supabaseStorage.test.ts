import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Supabase SDK so no real network call happens; capture the storage
// operations the provider issues.
const uploadMock = vi.fn();
const signMock = vi.fn();
const removeMock = vi.fn();
const fromMock = vi.fn(() => ({ upload: uploadMock, createSignedUrl: signMock, remove: removeMock }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ storage: { from: fromMock } })),
}));

async function loadStorage() {
  vi.resetModules();
  return (await import('../../../src/lib/storage/supabaseStorage')).SupabaseStorage;
}

describe('SupabaseStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.SUPABASE_STORAGE_BUCKET = 'documents';
  });
  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_STORAGE_BUCKET;
  });

  it('throws a clear error when required env is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SupabaseStorage = await loadStorage();
    expect(() => new SupabaseStorage()).toThrow(/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_URL|SUPABASE_STORAGE_BUCKET/);
  });

  it('uploads with upsert and returns the storage key', async () => {
    uploadMock.mockResolvedValue({ error: null });
    const SupabaseStorage = await loadStorage();
    const res = await new SupabaseStorage().put('docs/a.pdf', Buffer.from('x'), 'application/pdf');
    expect(res.storageKey).toBe('docs/a.pdf');
    expect(uploadMock).toHaveBeenCalledWith('docs/a.pdf', expect.any(Buffer), expect.objectContaining({ contentType: 'application/pdf', upsert: true }));
  });

  it('surfaces an upload error', async () => {
    uploadMock.mockResolvedValue({ error: { message: 'quota exceeded' } });
    const SupabaseStorage = await loadStorage();
    await expect(new SupabaseStorage().put('k', Buffer.from('x'), 'text/plain')).rejects.toThrow(/quota exceeded/);
  });

  it('returns a signed URL', async () => {
    signMock.mockResolvedValue({ data: { signedUrl: 'https://project.supabase.co/signed/abc' }, error: null });
    const SupabaseStorage = await loadStorage();
    const url = await new SupabaseStorage().getSignedUrl('k', 120);
    expect(url).toBe('https://project.supabase.co/signed/abc');
    expect(signMock).toHaveBeenCalledWith('k', 120);
  });

  it('throws when a signed URL cannot be produced', async () => {
    signMock.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const SupabaseStorage = await loadStorage();
    await expect(new SupabaseStorage().getSignedUrl('missing')).rejects.toThrow(/not found/);
  });

  it('deletes via remove', async () => {
    removeMock.mockResolvedValue({ error: null });
    const SupabaseStorage = await loadStorage();
    await new SupabaseStorage().delete('docs/a.pdf');
    expect(removeMock).toHaveBeenCalledWith(['docs/a.pdf']);
  });
});
