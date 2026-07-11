import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env';
import type { PutObjectResult, StorageProvider } from './storage.types';

/**
 * Supabase Storage provider — the production object store for this deployment
 * (same project as the Postgres DB). Uses the service-role key server-side, so
 * the bucket must be PRIVATE: objects are only reachable through short-lived
 * signed URLs (KYC documents, invoices). No AWS SDK / S3 credentials involved.
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET.
 */
export class SupabaseStorage implements StorageProvider {
  private client: SupabaseClient;
  private bucket: string;

  constructor() {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_STORAGE_BUCKET) {
      throw new Error(
        'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET are required when STORAGE_PROVIDER=supabase',
      );
    }
    this.bucket = env.SUPABASE_STORAGE_BUCKET;
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  private storage() {
    return this.client.storage.from(this.bucket);
  }

  async put(key: string, buffer: Buffer, contentType: string): Promise<PutObjectResult> {
    const { error } = await this.storage().upload(key, buffer, {
      contentType,
      upsert: true, // idempotent re-uploads of the same storage key
    });
    if (error) throw new Error(`Supabase storage upload failed: ${error.message}`);
    return { storageKey: key };
  }

  async getSignedUrl(key: string, expirySeconds = 300): Promise<string> {
    const { data, error } = await this.storage().createSignedUrl(key, expirySeconds);
    if (error || !data?.signedUrl) {
      throw new Error(`Supabase storage signed-URL failed: ${error?.message ?? 'no url returned'}`);
    }
    return data.signedUrl;
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.storage().remove([key]);
    if (error) throw new Error(`Supabase storage delete failed: ${error.message}`);
  }
}
