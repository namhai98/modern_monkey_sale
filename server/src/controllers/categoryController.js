import { query } from '../config/db.js';
import { slugify } from '../utils/validators.js';

export async function listCategories(req, res) {
  try {
    const { rows } = await query(
      `SELECT c.id, c.name, c.slug,
              COUNT(p.id) FILTER (WHERE p.is_active)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

export async function createCategory(req, res) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'name is required', code: 'VALIDATION_ERROR' });
    const slug = slugify(name);
    if (!slug) {
      return res.status(400).json({ error: 'name must contain letters or numbers', code: 'VALIDATION_ERROR' });
    }

    try {
      const { rows } = await query(
        'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug',
        [name, slug]
      );
      res.status(201).json({ ...rows[0], product_count: 0 });
    } catch (e) {
      if (e.code === '23505') {
        return res.status(409).json({ error: 'Category already exists', code: 'CATEGORY_TAKEN' });
      }
      throw e;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
}

export async function updateCategory(req, res) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'name is required', code: 'VALIDATION_ERROR' });
    const slug = slugify(name);

    try {
      const { rows } = await query(
        'UPDATE categories SET name = $1, slug = $2 WHERE id = $3 RETURNING id, name, slug',
        [name, slug, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Category not found' });
      res.json(rows[0]);
    } catch (e) {
      if (e.code === '23505') {
        return res.status(409).json({ error: 'Category already exists', code: 'CATEGORY_TAKEN' });
      }
      throw e;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update category' });
  }
}

export async function deleteCategory(req, res) {
  try {
    const inUse = await query('SELECT 1 FROM products WHERE category_id = $1 LIMIT 1', [req.params.id]);
    if (inUse.rows.length > 0) {
      return res.status(409).json({ error: 'Category is used by products', code: 'CATEGORY_IN_USE' });
    }
    const { rowCount } = await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Category not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
}
