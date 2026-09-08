// Money + discount display helpers. The backend is the source of truth for
// `final_price` / `discount_amount`; the frontend only formats what it sends.

export function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// A product from the API is on offer when its final_price is below its price.
export function isDiscounted(product) {
  const p = Number(product?.price);
  const f = Number(product?.final_price ?? p);
  return Number.isFinite(p) && Number.isFinite(f) && f < p;
}

// Whole-percent saving, works for both percentage and fixed discounts.
export function discountPercent(product) {
  const p = Number(product?.price) || 0;
  const f = Number(product?.final_price ?? p);
  if (!p || f >= p) return 0;
  return Math.round(((p - f) / p) * 100);
}

// The price a customer pays right now.
export function displayPrice(product) {
  return Number(product?.final_price ?? product?.price ?? 0);
}
