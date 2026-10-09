import { query } from '../config/db.js';

// The most a merge will take in one go — far more than anyone saves, small
// enough that a crafted request can't make us do real work.
const MAX_MERGE = 200;

const parseId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

async function listIds(userId) {
  const { rows } = await query(
    'SELECT product_id FROM wishlist_items WHERE user_id = $1 ORDER BY created_at DESC, product_id DESC',
    [userId]
  );
  return rows.map((r) => r.product_id);
}

export async function getWishlist(req, res) {
  try {
    res.json({ ids: await listIds(req.user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load saved pieces' });
  }
}

// PUT and DELETE are idempotent: saving twice or removing something not saved
// both just answer with the current list.
export async function addToWishlist(req, res) {
  const productId = parseId(req.params.productId);
  if (!productId) return res.status(400).json({ error: 'Invalid product id', code: 'VALIDATION_ERROR' });
  try {
    const { rowCount } = await query(
      `INSERT INTO wishlist_items (user_id, product_id)
       SELECT $1, id FROM products WHERE id = $2
       ON CONFLICT DO NOTHING`,
      [req.user.id, productId]
    );
    if (rowCount === 0) {
      const exists = await query('SELECT 1 FROM products WHERE id = $1', [productId]);
      if (exists.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ ids: await listIds(req.user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save piece' });
  }
}

export async function removeFromWishlist(req, res) {
  const productId = parseId(req.params.productId);
  if (!productId) return res.status(400).json({ error: 'Invalid product id', code: 'VALIDATION_ERROR' });
  try {
    await query('DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2', [req.user.id, productId]);
    res.json({ ids: await listIds(req.user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove piece' });
  }
}

// A guest's browser list, folded into the account on sign-in. Unknown ids are
// dropped silently — the product may have been deleted since it was saved.
export async function mergeWishlist(req, res) {
  const raw = Array.isArray(req.body?.ids) ? req.body.ids : null;
  if (!raw) return res.status(400).json({ error: 'ids must be an array', code: 'VALIDATION_ERROR' });
  const ids = [...new Set(raw.map(parseId).filter(Boolean))].slice(0, MAX_MERGE);
  try {
    if (ids.length > 0) {
      await query(
        `INSERT INTO wishlist_items (user_id, product_id)
         SELECT $1, id FROM products WHERE id = ANY($2::int[])
         ON CONFLICT DO NOTHING`,
        [req.user.id, ids]
      );
    }
    res.json({ ids: await listIds(req.user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to merge saved pieces' });
  }
}
