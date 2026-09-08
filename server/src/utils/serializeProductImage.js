import { storage } from '../storage/index.js';

// Legacy/external Unsplash urls: nudge the width param so old rows are still
// roughly right-sized per variant. New rows never hit this branch.
function unsplashAt(url, w) {
  return url && url.includes('images.unsplash.com')
    ? url.replace(/([?&])w=\d+/, `$1w=${w}`)
    : url;
}

// Row -> { id, sort_order, width, height, file_size, thumbnail, card, detail }
// where the three variant fields are ready-to-use public URLs.
export function serializeProductImage(row) {
  if (!row) return null;

  const base = {
    id: row.id,
    sort_order: row.sort_order ?? row.position ?? 0,
    width: row.width ?? null,
    height: row.height ?? null,
    file_size: row.file_size ?? null,
  };

  if (row.storage_key) {
    return {
      ...base,
      thumbnail: storage.url(`${row.storage_key}/thumbnail.webp`),
      card: storage.url(`${row.storage_key}/card.webp`),
      detail: storage.url(`${row.storage_key}/detail.webp`),
    };
  }

  const u = row.url || '';
  return {
    ...base,
    thumbnail: unsplashAt(u, 300),
    card: unsplashAt(u, 800),
    detail: unsplashAt(u, 1600),
  };
}
