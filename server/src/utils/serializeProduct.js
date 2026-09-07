// Shape a products row (joined with categories) for API responses.
export function serializeProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    image_url: row.image_url || '',
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
