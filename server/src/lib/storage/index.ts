import { env } from '../../config/env';
import { LocalDiskStorage } from './localDiskStorage';
import { S3Storage } from './s3Storage';
import type { StorageProvider } from './storage.types';

export type { StorageProvider, PutObjectResult } from './storage.types';

let instance: StorageProvider | undefined;

export function getStorage(): StorageProvider {
  if (!instance) {
    instance = env.STORAGE_PROVIDER === 's3' ? new S3Storage() : new LocalDiskStorage();
  }
  return instance;
}
