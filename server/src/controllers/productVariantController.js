import { query } from '../config/db.js';

// All routes are mounted at /api/products/:id/variants and are manager-only.

async function listRows(productId) {
  const { rows } = await query(
    `SELECT id, label, sku, stock, sort_order
     FROM product_variants WHERE product_id = $1
     ORDER BY sort_order, id`,
    [productId]
  );
  return rows;
}

async function productExists(id) {
  const { rows } = await query('SELECT 1 FROM products WHERE id = $1', [id]);
  return rows.length > 0;
}

function validate(body, { partial }) {
  const errs = [];
  const has = (k) => body[k] !== undefined;
  if (!partial || has('label')) {
    if (typeof body.label !== 'string' || !body.label.trim() || body.label.length > 40) {
      errs.push('label is required (max 40 characters)');
    }
  }
  if (has('stock') && (!Number.isInteger(body.stock) || body.stock < 0)) {
    errs.push('stock must be an integer >= 0');
  }
  if (has('sort_order') && !Number.isInteger(body.sort_order)) {
    errs.push('sort_order must be an integer');
  }
  if (has('sku') && body.sku !== null && typeof body.sku !== 'string') {
    errs.push('sku must be a string');
  }
  return errs;
}

export async function listVariants(req, res) {
  try {
    if (!(await productExists(req.params.id))) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ variants: await listRows(req.params.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
}

export async function createVariant(req, res) {
  try {
    if (!(await productExists(req.params.id))) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const b = req.body || {};
    const errs = validate(b, { partial: false });
    if (errs.length) return res.status(400).json({ error: errs.join('; '), code: 'VALIDATION_ERROR' });

    try {
      await query(
        `INSERT INTO product_variants (product_id, label, sku, stock, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.params.id,
          b.label.trim(),
          (b.sku && String(b.sku).trim()) || null,
          Number.isInteger(b.stock) ? b.stock : 0,
          Number.isInteger(b.sort_order) ? b.sort_order : 0,
        ]
      );
    } catch (e) {
      if (e.code === '23505') {
        return res.status(409).json({ error: 'That size or SKU already exists', code: 'DUPLICATE' });
      }
      throw e;
    }
    res.status(201).json({ variants: await listRows(req.params.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create variant' });
  }
}

export async function updateVariant(req, res) {
  try {
    const b = req.body || {};
    const errs = validate(b, { partial: true });
    if (errs.length) return res.status(400).json({ error: errs.join('; '), code: 'VALIDATION_ERROR' });

    const sets = [];
    const params = [];
    const put = (col, val) => {
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    };
    if (b.label !== undefined) put('label', b.label.trim());
    if (b.sku !== undefined) put('sku', (b.sku && String(b.sku).trim()) || null);
    if (b.stock !== undefined) put('stock', b.stock);
    if (b.sort_order !== undefined) put('sort_order', b.sort_order);
    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update', code: 'VALIDATION_ERROR' });
    }
    sets.push('updated_at = NOW()');
    params.push(req.params.variantId, req.params.id);

    let result;
    try {
      result = await query(
        `UPDATE product_variants SET ${sets.join(', ')}
         WHERE id = $${params.length - 1} AND product_id = $${params.length}`,
        params
      );
    } catch (e) {
      if (e.code === '23505') {
        return res.status(409).json({ error: 'That size or SKU already exists', code: 'DUPLICATE' });
      }
      throw e;
    }
    if (result.rowCount === 0) return res.status(404).json({ error: 'Variant not found' });
    res.json({ variants: await listRows(req.params.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update variant' });
  }
}

export async function deleteVariant(req, res) {
  try {
    const { rowCount } = await query(
      'DELETE FROM product_variants WHERE id = $1 AND product_id = $2',
      [req.params.variantId, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Variant not found' });
    res.json({ variants: await listRows(req.params.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete variant' });
  }
}
