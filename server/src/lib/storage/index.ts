import { env } from '../../config/env';
import { LocalDiskStorage } from './localDiskStorage';
import { S3Storage } from './s3Storage';
import { SupabaseStorage } from './supabaseStorage';
import type { StorageProvider } from './storage.types';

export type { StorageProvider, PutObjectResult } from './storage.types';

let instance: StorageProvider | undefined;

export function getStorage(): StorageProvider {
  if (!instance) {
    switch (env.STORAGE_PROVIDER) {
      case 'supabase':
        instance = new SupabaseStorage();
        break;
      case 's3':
        instance = new S3Storage();
        break;
      default:
        instance = new LocalDiskStorage();
    }
  }
  return instance;
}
