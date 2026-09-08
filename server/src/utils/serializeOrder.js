export function serializeOrderRow(row) {
  const out = {
    id: row.id,
    status: row.status,
    total: Number(row.total),
    shipping_address: row.shipping_address,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: row.user_id
      ? { id: row.user_id, name: row.user_name ?? null, email: row.user_email ?? null }
      : null,
  };
  if (row.item_count != null) out.item_count = Number(row.item_count);
  return out;
}

export function serializeOrderItem(row) {
  const price = Number(row.price); // final unit price actually paid
  const originalPrice = row.original_price != null ? Number(row.original_price) : price;
  const discountAmount = Number(row.discount_amount || 0);
  return {
    id: row.id,
    product_id: row.product_id,
    name: row.product_name ?? null,
    sku: row.product_sku ?? null,
    quantity: row.quantity,
    price,
    original_price: originalPrice,
    discount_amount: discountAmount,
    discount_name: row.discount_name ?? null,
    line_total: price * row.quantity,
  };
}

export function serializeStatusHistory(row) {
  return {
    id: row.id,
    from_status: row.from_status,
    to_status: row.to_status,
    note: row.note,
    user: row.user_id ? { id: row.user_id, name: row.user_name ?? null } : null,
    created_at: row.created_at,
  };
}
