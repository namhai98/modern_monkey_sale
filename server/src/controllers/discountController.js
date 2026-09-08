import { query, pool } from '../config/db.js';
import { serializeDiscount } from '../utils/serializeDiscount.js';
import { DISCOUNT_TYPES } from '../utils/discount.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isYmd = (v) => typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));

// discounts row + aggregates. to_char keeps DATE columns as plain 'YYYY-MM-DD'.
const LIST_SQL = `
  SELECT d.id, d.name, d.type, d.value, d.is_active,
         to_char(d.start_date, 'YYYY-MM-DD') AS start_date,
         to_char(d.end_date,   'YYYY-MM-DD') AS end_date,
         d.created_at, d.updated_at,
         COUNT(dp.product_id)::int AS product_count
  FROM discounts d
  LEFT JOIN discount_products dp ON dp.discount_id = d.id
  GROUP BY d.id`;

async function fetchOne(id) {
  const { rows } = await query(
    `SELECT d.id, d.name, d.type, d.value, d.is_active,
            to_char(d.start_date, 'YYYY-MM-DD') AS start_date,
            to_char(d.end_date,   'YYYY-MM-DD') AS end_date,
            d.created_at, d.updated_at,
            COALESCE(array_agg(dp.product_id ORDER BY dp.product_id)
                     FILTER (WHERE dp.product_id IS NOT NULL), '{}') AS product_ids,
            COUNT(dp.product_id)::int AS product_count
     FROM discounts d
     LEFT JOIN discount_products dp ON dp.discount_id = d.id
     WHERE d.id = $1
     GROUP BY d.id`,
    [id]
  );
  return rows[0] || null;
}

function validate(body, { partial }) {
  const errs = [];
  const has = (k) => body[k] !== undefined;

  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120) {
      errs.push('name is required (max 120 characters)');
    }
  }
  if (!partial || has('type')) {
    if (!DISCOUNT_TYPES.includes(body.type)) {
      errs.push(`type must be one of: ${DISCOUNT_TYPES.join(', ')}`);
    }
  }
  if (!partial || has('value')) {
    const v = Number(body.value);
    if (!Number.isFinite(v) || v <= 0) errs.push('value must be greater than 0');
    else if (body.type === 'percentage' && v > 100) errs.push('percentage cannot exceed 100');
  }
  if (!partial || has('start_date')) {
    if (!isYmd(body.start_date)) errs.push('start_date must be a valid YYYY-MM-DD date');
  }
  if (!partial || has('end_date')) {
    if (!isYmd(body.end_date)) errs.push('end_date must be a valid YYYY-MM-DD date');
  }
  if (isYmd(body.start_date) && isYmd(body.end_date) && body.end_date < body.start_date) {
    errs.push('end_date cannot be before start_date');
  }
  if (has('is_active') && typeof body.is_active !== 'boolean') {
    errs.push('is_active must be a boolean');
  }
  if (!partial || has('product_ids')) {
    if (!Array.isArray(body.product_ids) || body.product_ids.length === 0) {
      errs.push('select at least one product');
    } else if (!body.product_ids.every((id) => Number.isInteger(id) && id > 0)) {
      errs.push('product_ids must be positive integers');
    }
  }
  return errs;
}

async function assertProductsExist(client, ids) {
  const unique = [...new Set(ids)];
  const { rows } = await client.query('SELECT id FROM products WHERE id = ANY($1)', [unique]);
  if (rows.length !== unique.length) {
    throw Object.assign(new Error('One or more selected products do not exist'), {
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  }
  return unique;
}

async function replaceProducts(client, discountId, ids) {
  await client.query('DELETE FROM discount_products WHERE discount_id = $1', [discountId]);
  for (const pid of ids) {
    await client.query(
      'INSERT INTO discount_products (discount_id, product_id) VALUES ($1, $2)',
      [discountId, pid]
    );
  }
}

export async function listDiscounts(req, res) {
  try {
    const { rows } = await query(`${LIST_SQL} ORDER BY d.created_at DESC, d.id DESC`);
    res.json(rows.map(serializeDiscount));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch discounts' });
  }
}

export async function getDiscount(req, res) {
  try {
    const row = await fetchOne(req.params.id);
    if (!row) return res.status(404).json({ error: 'Discount not found' });
    res.json(serializeDiscount(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch discount' });
  }
}

export async function createDiscount(req, res) {
  const client = await pool.connect();
  try {
    const b = req.body || {};
    const errs = validate(b, { partial: false });
    if (errs.length) {
      return res.status(400).json({ error: errs.join('; '), code: 'VALIDATION_ERROR' });
    }

    await client.query('BEGIN');
    const ids = await assertProductsExist(client, b.product_ids);
    const ins = await client.query(
      `INSERT INTO discounts (name, type, value, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [b.name.trim(), b.type, Number(b.value), b.start_date, b.end_date, b.is_active !== false]
    );
    await replaceProducts(client, ins.rows[0].id, ids);
    await client.query('COMMIT');

    res.status(201).json(serializeDiscount(await fetchOne(ins.rows[0].id)));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
    console.error(err);
    res.status(500).json({ error: 'Failed to create discount' });
  } finally {
    client.release();
  }
}

export async function updateDiscount(req, res) {
  const client = await pool.connect();
  try {
    const b = req.body || {};
    const errs = validate(b, { partial: true });
    if (errs.length) {
      return res.status(400).json({ error: errs.join('; '), code: 'VALIDATION_ERROR' });
    }

    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM discounts WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Discount not found' });
    }

    const sets = [];
    const params = [];
    const put = (col, val) => {
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    };
    if (b.name !== undefined) put('name', b.name.trim());
    if (b.type !== undefined) put('type', b.type);
    if (b.value !== undefined) put('value', Number(b.value));
    if (b.start_date !== undefined) put('start_date', b.start_date);
    if (b.end_date !== undefined) put('end_date', b.end_date);
    if (b.is_active !== undefined) put('is_active', b.is_active);

    if (sets.length) {
      sets.push('updated_at = NOW()');
      params.push(req.params.id);
      await client.query(`UPDATE discounts SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    }
    if (b.product_ids !== undefined) {
      const ids = await assertProductsExist(client, b.product_ids);
      await replaceProducts(client, req.params.id, ids);
    }
    await client.query('COMMIT');

    res.json(serializeDiscount(await fetchOne(req.params.id)));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
    if (err.code === '23514') {
      return res.status(400).json({ error: 'Discount values violate a constraint', code: 'VALIDATION_ERROR' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update discount' });
  } finally {
    client.release();
  }
}

export async function deleteDiscount(req, res) {
  try {
    // discount_products rows go with it (ON DELETE CASCADE); products are untouched.
    const { rowCount } = await query('DELETE FROM discounts WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Discount not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete discount' });
  }
}
