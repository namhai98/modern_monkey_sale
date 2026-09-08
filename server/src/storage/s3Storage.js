// S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, …).
// The AWS SDK is imported lazily so `local` deployments never load it.
const DEFAULT_CACHE = 'public, max-age=31536000, immutable';

export class S3Storage {
  constructor() {
    this.bucket = process.env.STORAGE_BUCKET;
    this.region = process.env.STORAGE_REGION || 'auto';
    this.endpoint = (process.env.STORAGE_ENDPOINT || '').replace(/\/$/, '') || undefined;
    this.publicUrl = (process.env.STORAGE_PUBLIC_URL || '').replace(/\/$/, '');
    if (!this.bucket) {
      throw new Error('STORAGE_BUCKET is required when STORAGE_PROVIDER=s3');
    }
    this._client = null;
  }

  async #client() {
    if (this._client) return this._client;
    const { S3Client } = await import('@aws-sdk/client-s3');
    this._client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      forcePathStyle: Boolean(this.endpoint), // R2 / MinIO custom endpoints
      credentials: process.env.STORAGE_ACCESS_KEY
        ? {
            accessKeyId: process.env.STORAGE_ACCESS_KEY,
            secretAccessKey: process.env.STORAGE_SECRET_KEY,
          }
        : undefined,
    });
    return this._client;
  }

  async put(key, buffer, { contentType, cacheControl } = {}) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.#client();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
        CacheControl: cacheControl || DEFAULT_CACHE,
      })
    );
  }

  async delete(key) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.#client();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async deletePrefix(prefix) {
    const { ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
    const client = await this.#client();
    const Prefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
    let ContinuationToken;
    do {
      const list = await client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix, ContinuationToken })
      );
      const objects = (list.Contents || []).map((o) => ({ Key: o.Key }));
      if (objects.length) {
        await client.send(
          new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: objects } })
        );
      }
      ContinuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (ContinuationToken);
  }

  url(key) {
    if (this.publicUrl) return `${this.publicUrl}/${key}`;
    if (this.endpoint) return `${this.endpoint}/${this.bucket}/${key}`;
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
