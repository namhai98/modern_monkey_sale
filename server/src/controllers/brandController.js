import { query } from '../config/db.js';
import { slugify } from '../utils/validators.js';

export async function listBrands(req, res) {
  try {
    const { rows } = await query(
      `SELECT b.id, b.name, b.slug,
              COUNT(p.id) FILTER (WHERE p.is_active)::int AS product_count
       FROM brands b
       LEFT JOIN products p ON p.brand_id = b.id
       GROUP BY b.id
       ORDER BY b.name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
}

export async function createBrand(req, res) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'name is required', code: 'VALIDATION_ERROR' });
    const slug = slugify(name);
    if (!slug) {
      return res.status(400).json({ error: 'name must contain letters or numbers', code: 'VALIDATION_ERROR' });
    }

    try {
      const { rows } = await query(
        'INSERT INTO brands (name, slug) VALUES ($1, $2) RETURNING id, name, slug',
        [name, slug]
      );
      res.status(201).json({ ...rows[0], product_count: 0 });
    } catch (e) {
      if (e.code === '23505') {
        return res.status(409).json({ error: 'Brand already exists', code: 'BRAND_TAKEN' });
      }
      throw e;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create brand' });
  }
}

export async function updateBrand(req, res) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'name is required', code: 'VALIDATION_ERROR' });
    const slug = slugify(name);

    try {
      const { rows } = await query(
        'UPDATE brands SET name = $1, slug = $2 WHERE id = $3 RETURNING id, name, slug',
        [name, slug, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Brand not found' });
      res.json(rows[0]);
    } catch (e) {
      if (e.code === '23505') {
        return res.status(409).json({ error: 'Brand already exists', code: 'BRAND_TAKEN' });
      }
      throw e;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update brand' });
  }
}

export async function deleteBrand(req, res) {
  try {
    const inUse = await query('SELECT 1 FROM products WHERE brand_id = $1 LIMIT 1', [req.params.id]);
    if (inUse.rows.length > 0) {
      return res.status(409).json({ error: 'Brand is used by products', code: 'BRAND_IN_USE' });
    }
    const { rowCount } = await query('DELETE FROM brands WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Brand not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete brand' });
  }
}
