// Centralised discount maths. Every place that needs a discounted price — the
// product serializer, the order/checkout recalculation, tests — goes through
// here. Do not re-implement this anywhere else.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Normalise a Date or 'YYYY-MM-DD' (or ISO) value to a 'YYYY-MM-DD' string.
function ymd(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export const DISCOUNT_TYPES = ['percentage', 'fixed'];

// price + discount({ type, value }) -> { finalPrice, discountAmount, discount }.
// Never returns a negative price. `discount` echoes back a clean shape, or null.
export function computeDiscountedPrice(price, discount) {
  const base = round2(Math.max(0, Number(price) || 0));
  if (!discount || !DISCOUNT_TYPES.includes(discount.type)) {
    return { finalPrice: base, discountAmount: 0, discount: null };
  }
  const value = Math.max(0, Number(discount.value) || 0);
  const raw =
    discount.type === 'percentage' ? base - (base * value) / 100 : base - value;
  const finalPrice = round2(Math.max(0, raw));
  return {
    finalPrice,
    discountAmount: round2(base - finalPrice),
    discount: {
      id: discount.id ?? null,
      name: discount.name ?? null,
      type: discount.type,
      value: round2(value),
    },
  };
}

// A discount only applies when it is enabled AND today is inside its window.
// Expired / not-yet-started discounts simply don't count — no background job.
export function isDiscountActive(discount, now = new Date()) {
  if (!discount || discount.is_active === false) return false;
  const today = ymd(now);
  const start = ymd(discount.start_date);
  const end = ymd(discount.end_date);
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

// 'disabled' | 'scheduled' | 'expired' | 'active' — derived purely from the
// dates + the flag, for display in the admin list.
export function discountStatus(discount, now = new Date()) {
  if (!discount || discount.is_active === false) return 'disabled';
  const today = ymd(now);
  if (discount.start_date && today < ymd(discount.start_date)) return 'scheduled';
  if (discount.end_date && today > ymd(discount.end_date)) return 'expired';
  return 'active';
}

// MVP rule: never stack. If several active discounts touch one product, keep the
// single one that leaves the customer paying the least (tie -> lowest id).
export function pickBestActiveDiscount(price, discounts, now = new Date()) {
  const active = (discounts || []).filter((d) => isDiscountActive(d, now));
  let best = null;
  let bestFinal = Infinity;
  for (const d of active) {
    const { finalPrice } = computeDiscountedPrice(price, d);
    if (finalPrice < bestFinal || (finalPrice === bestFinal && best && d.id < best.id)) {
      best = d;
      bestFinal = finalPrice;
    }
  }
  return best;
}
