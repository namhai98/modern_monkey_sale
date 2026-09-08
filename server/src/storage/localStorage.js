import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

// Dev / single-node object store. Files live outside src/ (default server/var/media)
// and are served by the /media route with immutable long-cache headers.
// Production should set STORAGE_PROVIDER=s3.
export class LocalStorage {
  constructor() {
    this.root = path.resolve(process.env.STORAGE_LOCAL_DIR || 'var/media');
    this.publicPrefix = (process.env.STORAGE_PUBLIC_URL || '/media').replace(/\/$/, '');
    fs.mkdirSync(this.root, { recursive: true });
  }

  // Storage keys are always backend-generated (products/<id>/<uuid>/detail.webp).
  // Still, defensively strip anything path-traversal-y.
  #abs(key) {
    const parts = String(key)
      .replace(/\\/g, '/')
      .split('/')
      .filter((s) => s && s !== '.' && s !== '..');
    return path.join(this.root, ...parts);
  }

  async put(key, buffer) {
    const abs = this.#abs(key);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, buffer);
  }

  async delete(key) {
    await fsp.rm(this.#abs(key), { force: true });
  }

  async deletePrefix(prefix) {
    await fsp.rm(this.#abs(prefix), { recursive: true, force: true });
  }

  url(key) {
    return `${this.publicPrefix}/${key}`;
  }
}
