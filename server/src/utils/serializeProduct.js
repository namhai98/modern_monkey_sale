import { serializeProductImage } from './serializeProductImage.js';
import { computeDiscountedPrice } from './discount.js';

// Shape a products row (joined with categories; `images` is a jsonb array of
// product_images rows; `discount` is the single best active discount as jsonb,
// or null) for API responses.
export function serializeProduct(row) {
  if (!row) return null;

  const imageRows = Array.isArray(row.images) ? row.images : [];
  const images = imageRows.map(serializeProductImage).filter(Boolean);

  const variantRows = Array.isArray(row.variants) ? row.variants : [];
  const variants = variantRows.map((v) => ({
    id: v.id,
    label: v.label,
    sku: v.sku || null,
    stock: v.stock,
    in_stock: v.stock > 0,
  }));
  const hasVariants = variants.length > 0;
  // When a product has sizes, its stock is the sum of theirs; otherwise the
  // products row is authoritative.
  const stock = hasVariants ? variants.reduce((s, v) => s + v.stock, 0) : row.stock;

  const price = Number(row.price);
  const { finalPrice, discountAmount, discount } = computeDiscountedPrice(price, row.discount);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price,
    discount, // { id, name, type, value } | null
    final_price: finalPrice, // === price when there is no active discount
    discount_amount: discountAmount,
    // single field used by cards / cart / search — the primary image's `card` url
    image_url: row.image_url || images[0]?.card || images[0]?.detail || '',
    images,
    sku: row.sku || null,
    brand: row.brand || null,
    gender: row.gender || null,
    has_variants: hasVariants,
    variants,
    stock,
    low_stock_threshold: row.low_stock_threshold,
    low_stock: stock <= row.low_stock_threshold,
    is_active: row.is_active,
    category: row.category_id
      ? { id: row.category_id, name: row.category_name, slug: row.category_slug }
      : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
