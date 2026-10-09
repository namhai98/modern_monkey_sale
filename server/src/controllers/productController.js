import { query, pool } from '../config/db.js';
import { EFFECTIVE_STOCK_SQL, serializeProduct } from '../utils/serializeProduct.js';
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
         br.name AS brand_name, br.slug AS brand_slug,
         COALESCE(
           (SELECT jsonb_agg(to_jsonb(pi) ORDER BY pi.sort_order, pi.id)
            FROM product_images pi WHERE pi.product_id = p.id),
           '[]'::jsonb
         ) AS images,
         COALESCE(
           (SELECT jsonb_agg(jsonb_build_object('id', pv.id, 'label', pv.label,
                     'sku', pv.sku, 'stock', pv.stock) ORDER BY pv.sort_order, pv.id)
            FROM product_variants pv WHERE pv.product_id = p.id),
           '[]'::jsonb
         ) AS variants,
         CASE WHEN disc.id IS NULL THEN NULL ELSE to_jsonb(disc) END AS discount
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN brands br ON br.id = p.brand_id
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
  if (has('brand_id') && body.brand_id !== null && !Number.isInteger(body.brand_id)) {
    errs.push('brand_id must be an integer');
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

// The price a shopper actually pays: the cheapest currently-active discount
// applied, or the list price. The same rule as SELECT_BASE's LATERAL join, as
// an expression — so price filters and price sorting match the price shown.
// (LEAST ignores the NULL of "no discount".)
const EFFECTIVE_PRICE_SQL = `(SELECT LEAST(p.price, MIN(CASE d.type
      WHEN 'percentage' THEN GREATEST(0, p.price - p.price * d.value / 100)
      WHEN 'fixed' THEN GREATEST(0, p.price - d.value) END))
   FROM discounts d
   JOIN discount_products dp ON dp.discount_id = d.id AND dp.product_id = p.id
   WHERE d.is_active = TRUE AND CURRENT_DATE BETWEEN d.start_date AND d.end_date)`;

const ON_SALE_SQL = `EXISTS (
  SELECT 1 FROM discount_products dps
  JOIN discounts ds ON ds.id = dps.discount_id
  WHERE dps.product_id = p.id
    AND ds.is_active = TRUE
    AND CURRENT_DATE BETWEEN ds.start_date AND ds.end_date
)`;

const parsePrice = (v) => {
  const n = Number(v);
  return v !== undefined && v !== '' && Number.isFinite(n) && n >= 0 ? n : null;
};

// `brand` takes one slug/id or several, comma-separated.
const brandList = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);

/* The storefront filters, shared by the listing and the facet counts so the
   two can never disagree. `exclude` leaves one filter out — a facet is counted
   under every filter but its own. Expects `products p` joined to
   `categories c` and `brands br`. */
function buildProductFilters(q, { exclude = null, includeInactive = false } = {}) {
  const where = [];
  const params = [];
  const add = (v) => {
    params.push(v);
    return `$${params.length}`;
  };

  if (!includeInactive) where.push('p.is_active = TRUE');
  if (q.search) {
    const s = add(`%${q.search}%`);
    where.push(`(p.name ILIKE ${s} OR br.name ILIKE ${s} OR p.sku ILIKE ${s})`);
  }
  if (q.category) {
    const cat = String(q.category);
    where.push(/^\d+$/.test(cat) ? `p.category_id = ${add(Number(cat))}` : `c.slug = ${add(cat)}`);
  }
  if (exclude !== 'brand' && q.brand) {
    const list = brandList(q.brand);
    const ids = list.filter((b) => /^\d+$/.test(b)).map(Number);
    const slugs = list.filter((b) => !/^\d+$/.test(b));
    const parts = [];
    if (ids.length) parts.push(`p.brand_id = ANY(${add(ids)}::int[])`);
    if (slugs.length) parts.push(`br.slug = ANY(${add(slugs)}::text[])`);
    if (parts.length) where.push(`(${parts.join(' OR ')})`);
  }
  if (exclude !== 'gender' && q.gender) {
    where.push(`p.gender = ${add(String(q.gender))}`);
  }
  if (q.on_sale === '1') where.push(ON_SALE_SQL);
  if (q.in_stock === '1') where.push(`${EFFECTIVE_STOCK_SQL} > 0`);
  if (exclude !== 'price') {
    const min = parsePrice(q.price_min);
    const max = parsePrice(q.price_max);
    if (min !== null) where.push(`${EFFECTIVE_PRICE_SQL} >= ${add(min)}`);
    if (max !== null) where.push(`${EFFECTIVE_PRICE_SQL} <= ${add(max)}`);
  }
  return { where, params, add };
}

export async function listProducts(req, res) {
  try {
    const includeInactive = req.query.include_inactive === '1' && isStaff(req);
    const { where, params, add } = buildProductFilters(req.query, { includeInactive });

    if (req.query.ids) {
      const ids = String(req.query.ids)
        .split(',')
        .map((n) => Number(n.trim()))
        .filter(Number.isInteger);
      if (ids.length === 0) return res.json({ items: [], total: 0, page: 1, limit: 0 });
      where.push(`p.id = ANY(${add(ids)})`);
    }
    if (req.query.low_stock === '1') {
      // A piece sold in sizes keeps its stock per size, so count those —
      // the same total the serializer uses for the low-stock tag.
      where.push(`${EFFECTIVE_STOCK_SQL} <= p.low_stock_threshold`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    // Price sorts by what the shopper pays, matching the price on the card.
    const sortKey = req.query.sort === 'price' ? EFFECTIVE_PRICE_SQL : SORTABLE[req.query.sort] || 'p.created_at';
    const order = String(req.query.order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands br ON br.id = p.brand_id ${whereSql}`,
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
    // Each facet is counted under every active filter except its own: the
    // brand list reflects the chosen gender and vice versa, so no chip leads to
    // an empty page — while a facet never narrows itself to the one option
    // already picked, which would leave nothing to switch to.
    const scope = (exclude) => {
      const { where, params } = buildProductFilters(req.query, { exclude });
      return {
        params,
        from: `FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands br ON br.id = p.brand_id
         WHERE ${where.join(' AND ')}`,
      };
    };

    const b = scope('brand');
    const brands = (
      await query(
        `SELECT br.id, br.name, br.slug, COUNT(*)::int AS count ${b.from}
           AND br.id IS NOT NULL
         GROUP BY br.id, br.name, br.slug ORDER BY br.name`,
        b.params
      )
    ).rows;
    const g = scope('gender');
    const genders = (
      await query(
        `SELECT p.gender AS value, COUNT(*)::int AS count ${g.from}
           AND p.gender IS NOT NULL
         GROUP BY p.gender`,
        g.params
      )
    ).rows;

    // A selected option the other filters have emptied must stay on screen —
    // otherwise the shopper sees "0 products" with nothing visibly chosen and
    // no chip to unpick (e.g. a brand with nothing on sale, then Sale ticked).
    const missing = brandList(req.query.brand).filter(
      (sel) => !brands.some((r) => (/^\d+$/.test(sel) ? r.id === Number(sel) : r.slug === sel))
    );
    if (missing.length) {
      const { rows } = await query(
        `SELECT id, name, slug FROM brands WHERE slug = ANY($1::text[]) OR id::text = ANY($1::text[])`,
        [missing]
      );
      for (const r of rows) brands.push({ ...r, count: 0 });
      brands.sort((x, y) => x.name.localeCompare(y.name));
    }

    // The price span of the current selection (every filter but price), in
    // USD as paid — the rail shows it as a hint beside the price inputs.
    const pr = scope('price');
    const priceRow = (
      await query(
        `SELECT MIN(${EFFECTIVE_PRICE_SQL})::float AS min, MAX(${EFFECTIVE_PRICE_SQL})::float AS max ${pr.from}`,
        pr.params
      )
    ).rows[0];
    const order = { women: 0, men: 1, unisex: 2 };
    const selGender = req.query.gender;
    if (typeof selGender === 'string' && Object.hasOwn(order, selGender) && !genders.some((r) => r.value === selGender)) {
      genders.push({ value: selGender, count: 0 });
    }

    res.json({
      brands,
      genders: genders.sort((a, b) => (order[a.value] ?? 9) - (order[b.value] ?? 9)),
      price: { min: priceRow?.min ?? null, max: priceRow?.max ?? null },
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
    if (b.brand_id != null) {
      const br = await client.query('SELECT id FROM brands WHERE id = $1', [b.brand_id]);
      if (br.rows.length === 0) {
        return res.status(400).json({ error: 'Unknown brand_id', code: 'VALIDATION_ERROR' });
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
           (name, description, price, image_url, category_id, sku, stock, low_stock_threshold, brand_id, gender)
         VALUES ($1, $2, $3, '', $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          b.name.trim(),
          b.description ?? null,
          b.price,
          b.category_id ?? null,
          (b.sku && String(b.sku).trim()) || null,
          stock,
          threshold,
          b.brand_id ?? null,
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
    if (b.brand_id != null) {
      const br = await query('SELECT id FROM brands WHERE id = $1', [b.brand_id]);
      if (br.rows.length === 0) {
        return res.status(400).json({ error: 'Unknown brand_id', code: 'VALIDATION_ERROR' });
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
    if (b.brand_id !== undefined) put('brand_id', b.brand_id);
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

