import crypto from 'node:crypto';
import { query, pool } from '../config/db.js';
import { storage, IMMUTABLE_CACHE_CONTROL } from '../storage/index.js';
import { processImage, ImageError } from '../services/imageProcessor.js';
import { serializeProductImage } from '../utils/serializeProductImage.js';

const MAX_IMAGES = 5;

async function loadImages(productId) {
  const { rows } = await query(
    'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order, id',
    [productId]
  );
  return rows.map(serializeProductImage);
}

// Keep products.image_url = the primary image's `card` url so the many places
// that read the single field (cards, cart, search, checkout) stay correct.
async function syncPrimary(productId) {
  const { rows } = await query(
    'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order, id LIMIT 1',
    [productId]
  );
  const primary = rows[0] ? serializeProductImage(rows[0]) : null;
  await query('UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2', [
    primary ? primary.card : '',
    productId,
  ]);
}

async function repackOrder(productId) {
  const { rows } = await query(
    'SELECT id FROM product_images WHERE product_id = $1 ORDER BY sort_order, id',
    [productId]
  );
  for (let i = 0; i < rows.length; i += 1) {
    await query('UPDATE product_images SET sort_order = $1 WHERE id = $2', [i, rows[i].id]);
  }
}

async function applyOrder(client, productId, orderedIds) {
  await client.query('BEGIN');
  for (let i = 0; i < orderedIds.length; i += 1) {
    await client.query('UPDATE product_images SET sort_order = $1, updated_at = NOW() WHERE id = $2', [
      i,
      orderedIds[i],
    ]);
  }
  await client.query('COMMIT');
}

export async function uploadImage(req, res) {
  const productId = Number(req.params.id);
  try {
    const prod = await query('SELECT id FROM products WHERE id = $1', [productId]);
    if (prod.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded', code: 'VALIDATION_ERROR' });
    }

    const countRes = await query(
      'SELECT COUNT(*)::int AS n FROM product_images WHERE product_id = $1',
      [productId]
    );
    const existing = countRes.rows[0].n;
    if (existing >= MAX_IMAGES) {
      return res
        .status(409)
        .json({ error: `A product can have at most ${MAX_IMAGES} images`, code: 'IMAGE_LIMIT' });
    }

    let processed;
    try {
      processed = await processImage(req.file.buffer);
    } catch (e) {
      if (e instanceof ImageError) {
        return res.status(400).json({ error: e.message, code: e.code });
      }
      throw e;
    }

    // Backend-generated, non-guessable, immutable key
    const storageKey = `products/${productId}/${crypto.randomUUID()}`;
    const detail = processed.variants.find((v) => v.name === 'detail');

    try {
      for (const v of processed.variants) {
        await storage.put(`${storageKey}/${v.name}.${v.ext}`, v.buffer, {
          contentType: v.contentType,
          cacheControl: IMMUTABLE_CACHE_CONTROL,
        });
      }
    } catch (e) {
      await storage.deletePrefix(storageKey).catch(() => {});
      throw e;
    }

    const { rows } = await query(
      `INSERT INTO product_images
         (product_id, storage_key, sort_order, width, height, mime_type, file_size)
       VALUES ($1, $2, $3, $4, $5, 'image/webp', $6)
       RETURNING *`,
      [productId, storageKey, existing, detail.width, detail.height, detail.size]
    );
    await syncPrimary(productId);

    const totalBytes = processed.variants.reduce((n, v) => n + v.size, 0);
    console.info(
      '[images] upload product=%d key=%s in=%dB out=%dB (%d variants, detail %dx%d)',
      productId,
      storageKey,
      req.file.size,
      totalBytes,
      processed.variants.length,
      detail.width,
      detail.height
    );

    res.status(201).json({
      image: serializeProductImage(rows[0]),
      images: await loadImages(productId),
    });
  } catch (err) {
    console.error('[images] upload failed', err);
    res.status(500).json({ error: 'Failed to process image' });
  }
}

export async function deleteImage(req, res) {
  const productId = Number(req.params.id);
  const imageId = Number(req.params.imageId);
  try {
    const { rows } = await query(
      'SELECT * FROM product_images WHERE id = $1 AND product_id = $2',
      [imageId, productId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Image not found' });

    await query('DELETE FROM product_images WHERE id = $1', [imageId]);

    if (rows[0].storage_key) {
      await storage
        .deletePrefix(rows[0].storage_key)
        .catch((e) => console.error('[images] storage cleanup failed', rows[0].storage_key, e));
    }

    await repackOrder(productId);
    await syncPrimary(productId);
    console.info('[images] delete product=%d image=%d key=%s', productId, imageId, rows[0].storage_key || rows[0].url);

    res.json({ images: await loadImages(productId) });
  } catch (err) {
    console.error('[images] delete failed', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
}

export async function reorderImages(req, res) {
  const productId = Number(req.params.id);
  const order = Array.isArray(req.body?.order) ? req.body.order.map(Number) : null;
  if (!order || order.length === 0) {
    return res
      .status(400)
      .json({ error: 'order must be a non-empty array of image ids', code: 'VALIDATION_ERROR' });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT id FROM product_images WHERE product_id = $1', [
      productId,
    ]);
    const owned = new Set(rows.map((r) => r.id));
    const distinct = new Set(order);
    if (order.length !== owned.size || distinct.size !== order.length || order.some((id) => !owned.has(id))) {
      return res.status(400).json({
        error: 'order must list each of this product’s image ids exactly once',
        code: 'VALIDATION_ERROR',
      });
    }

    await applyOrder(client, productId, order);
    await syncPrimary(productId);
    res.json({ images: await loadImages(productId) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[images] reorder failed', err);
    res.status(500).json({ error: 'Failed to reorder images' });
  } finally {
    client.release();
  }
}

export async function setPrimaryImage(req, res) {
  const productId = Number(req.params.id);
  const imageId = Number(req.params.imageId);

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT id FROM product_images WHERE product_id = $1 ORDER BY sort_order, id',
      [productId]
    );
    const ids = rows.map((r) => r.id);
    if (!ids.includes(imageId)) return res.status(404).json({ error: 'Image not found' });

    const ordered = [imageId, ...ids.filter((id) => id !== imageId)];
    await applyOrder(client, productId, ordered);
    await syncPrimary(productId);
    res.json({ images: await loadImages(productId) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[images] set primary failed', err);
    res.status(500).json({ error: 'Failed to set primary image' });
  } finally {
    client.release();
  }
}

// Called when a product is hard-deleted (DB cascade removes the rows; this
// removes their storage objects too).
export async function purgeProductImages(productId) {
  await storage.deletePrefix(`products/${productId}`).catch((e) =>
    console.error('[images] purge failed for product', productId, e)
  );
}
