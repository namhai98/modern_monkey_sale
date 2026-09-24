// Money + discount display helpers. The backend is the source of truth for
// `final_price` / `discount_amount`; the frontend only formats what it sends.
// Prices are *stored* in USD — that is bookkeeping, not what a shopper sees.
// The storefront quotes tögrög at the day's live rate, via useMoney().
import { useLocale } from '../context/LocaleContext';

// USD — the base currency the catalogue is priced in (admin screens use this).
export function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Tögrög — the storefront's currency, in both languages, so a price never
// changes meaning when someone flips the language switch. Converted at the
// live rate and rounded DOWN to the nearest thousand (1,450,896 → 1,450,000₮).
//
// No rate means the feed is down: fall back to the stored USD figure rather
// than print a converted number we can't stand behind.
export function formatMoney(n, mntRate) {
  const rate = Number(mntRate);
  if (Number.isFinite(rate) && rate > 0) {
    const mnt = Math.floor((Number(n || 0) * rate) / 1000) * 1000;
    return `${mnt.toLocaleString('en-US')}₮`;
  }
  return money(n);
}

// Hook: `const m = useMoney(); m(product.price)` — prices at the live rate.
export function useMoney() {
  const { mntRate } = useLocale();
  return (n) => formatMoney(n, mntRate);
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
