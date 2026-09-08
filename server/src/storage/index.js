import { LocalStorage } from './localStorage.js';
import { S3Storage } from './s3Storage.js';

// STORAGE_PROVIDER: local (default, dev) | s3 (AWS S3 / R2 / MinIO — any S3 API)
export const STORAGE_PROVIDER = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

export const storage = ['s3', 'r2', 'minio', 'aws'].includes(STORAGE_PROVIDER)
  ? new S3Storage()
  : new LocalStorage();

// Long-lived immutable caching — safe because every storage key carries a
// unique per-upload id, so replacing an image always yields a new URL.
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
