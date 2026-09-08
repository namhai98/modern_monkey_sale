import { serializeProductImage } from './serializeProductImage.js';

// Shape a products row (joined with categories; `images` is a jsonb array of
// product_images rows) for API responses.
export function serializeProduct(row) {
  if (!row) return null;

  const imageRows = Array.isArray(row.images) ? row.images : [];
  const images = imageRows.map(serializeProductImage).filter(Boolean);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    // single field used by cards / cart / search — the primary image's `card` url
    image_url: row.image_url || images[0]?.card || images[0]?.detail || '',
    images,
    sku: row.sku || null,
    stock: row.stock,
    low_stock_threshold: row.low_stock_threshold,
    low_stock: row.stock <= row.low_stock_threshold,
    is_active: row.is_active,
    category: row.category_id
      ? { id: row.category_id, name: row.category_name, slug: row.category_slug }
      : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
