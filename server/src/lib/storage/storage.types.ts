export interface PutObjectResult {
  storageKey: string;
}

export interface StorageProvider {
  put(key: string, buffer: Buffer, contentType: string): Promise<PutObjectResult>;
  getSignedUrl(key: string, expirySeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
