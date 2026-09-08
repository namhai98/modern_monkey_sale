import { query, pool } from '../config/db.js';
import { serializeProduct } from '../utils/serializeProduct.js';
import { isNonNegativeNumber, isNonNegativeInt } from '../utils/validators.js';

const SORTABLE = {
  name: 'p.name',
  price: 'p.price',
  stock: 'p.stock',
  created_at: 'p.created_at',
};
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const GENDERS = ['women', 'men', 'unisex'];

// Product images are managed via the /api/products/:id/images sub-resource
// (see productImageController). `SELECT_BASE` embeds the current image set and,
// via one LATERAL join (no N+1), the single best currently-active discount for
// the product — the one leaving the customer paying the least.
const SELECT_BASE = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug,
         COALESCE(
           (SELECT jsonb_agg(to_jsonb(pi) ORDER BY pi.sort_order, pi.id)
            FROM product_images pi WHERE pi.product_id = p.id),
           '[]'::jsonb
         ) AS images,
         CASE WHEN disc.id IS NULL THEN NULL ELSE to_jsonb(disc) END AS discount
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT d.id, d.name, d.type, d.value
    FROM discounts d
    JOIN discount_products dp ON dp.discount_id = d.id AND dp.product_id = p.id
    WHERE d.is_active = TRUE
      AND CURRENT_DATE BETWEEN d.start_date AND d.end_date
    ORDER BY (CASE d.type
        WHEN 'percentage' THEN GREATEST(0, p.price - p.price * d.value / 100)
        WHEN 'fixed' THEN GREATEST(0, p.price - d.value)
        ELSE p.price END) ASC, d.id ASC
    LIMIT 1
  ) disc ON TRUE`;

function isStaff(req) {
  return req.user && ['manager', 'admin'].includes(req.user.role);
}

function validateProductInput(body, { partial }) {
  const errs = [];
  const has = (k) => body[k] !== undefined;

  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) errs.push('name is required');
  }
  if (!partial || has('price')) {
    if (!isNonNegativeNumber(body.price)) errs.push('price must be a number >= 0');
  }
  if (has('low_stock_threshold') && !isNonNegativeInt(body.low_stock_threshold)) {
    errs.push('low_stock_threshold must be an integer >= 0');
  }
  if (has('is_active') && typeof body.is_active !== 'boolean') {
    errs.push('is_active must be a boolean');
  }
  if (has('brand') && body.brand !== null) {
    if (typeof body.brand !== 'string' || body.brand.length > 120) {
      errs.push('brand must be a string of at most 120 characters');
    }
  }
  if (has('gender') && body.gender !== null && body.gender !== '') {
    if (!GENDERS.includes(body.gender)) errs.push(`gender must be one of: ${GENDERS.join(', ')}`);
  }
  return errs;
}

async function fetchOne(id) {
  const { rows } = await query(`${SELECT_BASE} WHERE p.id = $1`, [id]);
  return rows[0] || null;
}

export async function listProducts(req, res) {
  try {
    const includeInactive = req.query.include_inactive === '1' && isStaff(req);

    const where = [];
    const params = [];

    if (!includeInactive) where.push('p.is_active = TRUE');

    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      const s = `$${params.length}`;
      where.push(`(p.name ILIKE ${s} OR p.brand ILIKE ${s} OR p.sku ILIKE ${s})`);
    }
    if (req.query.category) {
      const cat = String(req.query.category);
      params.push(/^\d+$/.test(cat) ? Number(cat) : cat);
      where.push(/^\d+$/.test(cat) ? `p.category_id = $${params.length}` : `c.slug = $${params.length}`);
    }
    if (req.query.ids) {
      const ids = String(req.query.ids)
        .split(',')
        .map((n) => Number(n.trim()))
        .filter(Number.isInteger);
      if (ids.length === 0) return res.json({ items: [], total: 0, page: 1, limit: 0 });
      params.push(ids);
      where.push(`p.id = ANY($${params.length})`);
    }
    if (req.query.brand) {
      params.push(String(req.query.brand));
      where.push(`p.brand = $${params.length}`);
    }
    if (req.query.gender) {
      params.push(String(req.query.gender));
      where.push(`p.gender = $${params.length}`);
    }
    if (req.query.on_sale === '1') {
      where.push(`EXISTS (
        SELECT 1 FROM discount_products dps
        JOIN discounts ds ON ds.id = dps.discount_id
        WHERE dps.product_id = p.id
          AND ds.is_active = TRUE
          AND CURRENT_DATE BETWEEN ds.start_date AND ds.end_date
      )`);
    }
    if (req.query.low_stock === '1') {
      where.push('p.stock <= p.low_stock_threshold');
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sortKey = SORTABLE[req.query.sort] || 'p.created_at';
    const order = String(req.query.order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM products p
       LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`,
      params
    );
    const itemsRes = await query(
      `${SELECT_BASE} ${whereSql}
       ORDER BY ${sortKey} ${order}, p.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      items: itemsRes.rows.map(serializeProduct),
      total: countRes.rows[0].total,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

// Filter options for the storefront — the brands and genders actually present,
// optionally scoped to a category. Active products only.
export async function listProductFacets(req, res) {
  try {
    const params = [];
    const where = ['p.is_active = TRUE'];
    if (req.query.category) {
      const cat = String(req.query.category);
      params.push(/^\d+$/.test(cat) ? Number(cat) : cat);
      where.push(/^\d+$/.test(cat) ? `p.category_id = $${params.length}` : `c.slug = $${params.length}`);
    }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      const s = `$${params.length}`;
      where.push(`(p.name ILIKE ${s} OR p.brand ILIKE ${s} OR p.sku ILIKE ${s})`);
    }
    if (req.query.on_sale === '1') {
      where.push(`EXISTS (
        SELECT 1 FROM discount_products dps
        JOIN discounts ds ON ds.id = dps.discount_id
        WHERE dps.product_id = p.id
          AND ds.is_active = TRUE
          AND CURRENT_DATE BETWEEN ds.start_date AND ds.end_date
      )`);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const base = `FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`;

    const brands = await query(
      `SELECT p.brand AS value, COUNT(*)::int AS count ${base}
         AND p.brand IS NOT NULL AND p.brand <> ''
       GROUP BY p.brand ORDER BY p.brand`,
      params
    );
    const genders = await query(
      `SELECT p.gender AS value, COUNT(*)::int AS count ${base}
         AND p.gender IS NOT NULL
       GROUP BY p.gender`,
      params
    );

    const order = { women: 0, men: 1, unisex: 2 };
    res.json({
      brands: brands.rows,
      genders: genders.rows.sort((a, b) => (order[a.value] ?? 9) - (order[b.value] ?? 9)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product facets' });
  }
}

export async function getProduct(req, res) {
  try {
    const row = await fetchOne(req.params.id);
    if (!row || (!row.is_active && !isStaff(req))) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(serializeProduct(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
}

export async function createProduct(req, res) {
  const client = await pool.connect();
  try {
    const b = req.body;
    const errs = validateProductInput(b, { partial: false });
    if (b.stock !== undefined && !isNonNegativeInt(b.stock)) errs.push('stock must be an integer >= 0');
    if (errs.length) return res.status(400).json({ error: errs.join('; '), code: 'VALIDATION_ERROR' });

    if (b.category_id != null) {
      const c = await client.query('SELECT id FROM categories WHERE id = $1', [b.category_id]);
      if (c.rows.length === 0) {
        return res.status(400).json({ error: 'Unknown category_id', code: 'VALIDATION_ERROR' });
      }
    }

    const stock = isNonNegativeInt(b.stock) ? b.stock : 0;
    const threshold = isNonNegativeInt(b.low_stock_threshold) ? b.low_stock_threshold : 0;

    await client.query('BEGIN');
    let id;
    try {
      // image_url starts empty; the first image upload sets it (see productImageController.syncPrimary)
      const ins = await client.query(
        `INSERT INTO products
           (name, description, price, image_url, category_id, sku, stock, low_stock_threshold, brand, gender)
         VALUES ($1, $2, $3, '', $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          b.name.trim(),
          b.description ?? null,
          b.price,
          b.category_id ?? null,
          (b.sku && String(b.sku).trim()) || null,
          stock,
          threshold,
          (b.brand && String(b.brand).trim()) || null,
          b.gender || null,
        ]
      );
      id = ins.rows[0].id;
    } catch (e) {
      await client.query('ROLLBACK');
      if (e.code === '23505') return res.status(409).json({ error: 'SKU already exists', code: 'SKU_TAKEN' });
      throw e;
    }

    if (stock > 0) {
      await client.query(
        `INSERT INTO stock_movements (product_id, delta, type, reason, user_id)
         VALUES ($1, $2, 'restock', 'Initial stock', $3)`,
        [id, stock, req.user.id]
      );
    }
    await client.query('COMMIT');

    res.status(201).json(serializeProduct(await fetchOne(id)));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to create product' });
  } finally {
    client.release();
  }
}

export async function updateProduct(req, res) {
  try {
    const b = req.body;
    const errs = validateProductInput(b, { partial: true });
    if (errs.length) return res.status(400).json({ error: errs.join('; '), code: 'VALIDATION_ERROR' });

    const existing = await query('SELECT id FROM products WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    if (b.category_id != null) {
      const c = await query('SELECT id FROM categories WHERE id = $1', [b.category_id]);
      if (c.rows.length === 0) {
        return res.status(400).json({ error: 'Unknown category_id', code: 'VALIDATION_ERROR' });
      }
    }

    const sets = [];
    const params = [];
    const put = (col, val) => {
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    };

    if (b.name !== undefined) put('name', b.name.trim());
    if (b.description !== undefined) put('description', b.description);
    if (b.price !== undefined) put('price', b.price);
    if (b.category_id !== undefined) put('category_id', b.category_id);
    if (b.sku !== undefined) put('sku', (b.sku && String(b.sku).trim()) || null);
    if (b.brand !== undefined) put('brand', (b.brand && String(b.brand).trim()) || null);
    if (b.gender !== undefined) put('gender', b.gender || null);
    if (b.low_stock_threshold !== undefined) put('low_stock_threshold', b.low_stock_threshold);
    if (b.is_active !== undefined) put('is_active', b.is_active);

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update', code: 'VALIDATION_ERROR' });
    }

    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    try {
      await query(`UPDATE products SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'SKU already exists', code: 'SKU_TAKEN' });
      throw e;
    }

    res.json(serializeProduct(await fetchOne(req.params.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product' });
  }
}

// Stock only ever changes here or through order fulfilment, so stock_movements
// is always a complete ledger explaining the current level.
export async function adjustStock(req, res) {
  const client = await pool.connect();
  try {
    const { delta, set, reason } = req.body;
    const type = req.body.type || 'adjustment';
    const ALLOWED = ['restock', 'adjustment', 'return'];
    if (!ALLOWED.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${ALLOWED.join(', ')}`, code: 'VALIDATION_ERROR' });
    }

    const hasDelta = Number.isInteger(delta);
    const hasSet = Number.isInteger(set);
    if (hasDelta === hasSet) {
      return res.status(400).json({ error: 'Provide exactly one of delta or set (integers)', code: 'VALIDATION_ERROR' });
    }
    if (hasSet && set < 0) {
      return res.status(400).json({ error: 'set must be >= 0', code: 'VALIDATION_ERROR' });
    }

    await client.query('BEGIN');
    const cur = await client.query('SELECT stock FROM products WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (cur.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const current = cur.rows[0].stock;
    const change = hasDelta ? delta : set - current;
    const next = current + change;
    if (next < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Resulting stock would be negative', code: 'VALIDATION_ERROR' });
    }

    await client.query('UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2', [next, req.params.id]);
    if (change !== 0) {
      await client.query(
        `INSERT INTO stock_movements (product_id, delta, type, reason, user_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.params.id, change, type, reason || null, req.user.id]
      );
    }
    await client.query('COMMIT');

    res.json(serializeProduct(await fetchOne(req.params.id)));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Failed to adjust stock' });
  } finally {
    client.release();
  }
}

export async function listStockMovements(req, res) {
  try {
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const { rows } = await query(
      `SELECT m.*, u.name AS user_name
       FROM stock_movements m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.product_id = $1
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT $2`,
      [req.params.id, limit]
    );
    res.json({
      items: rows.map((r) => ({
        id: r.id,
        delta: r.delta,
        type: r.type,
        reason: r.reason,
        order_id: r.order_id,
        user: r.user_name,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
}

