import { discountStatus } from './discount.js';

// discounts row (optionally joined with product_count / product_ids) -> API shape.
export function serializeDiscount(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    value: Number(row.value),
    start_date: row.start_date, // 'YYYY-MM-DD' (queries use to_char)
    end_date: row.end_date,
    is_active: row.is_active,
    status: discountStatus({
      is_active: row.is_active,
      start_date: row.start_date,
      end_date: row.end_date,
    }),
    product_count:
      row.product_count != null ? Number(row.product_count) : undefined,
    product_ids: Array.isArray(row.product_ids)
      ? row.product_ids.filter((id) => id != null).map(Number)
      : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
