// Money + discount display helpers. The backend is the source of truth for
// `final_price` / `discount_amount`; the frontend only formats what it sends.
// Prices are *stored* in USD. Mongolian shoppers see tögrög at the stored live
// rate; English shoppers see the stored dollar figure — via useMoney().
import { useLocale } from '../context/LocaleContext';

// USD — the base currency the catalogue is priced in (admin screens use this).
export function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Locale-aware. In Mongolian, convert the stored USD price at the stored live
// rate and round DOWN to the nearest thousand tögrög (1,450,896 → 1,450,000₮).
// In English, show the stored USD price as-is — both figures come from the
// same stored price, so switching language never changes what a thing costs.
//
// No rate in Mongolian means the feed is down: fall back to the stored USD
// figure rather than print a converted number we can't stand behind.
export function formatMoney(n, locale, mntRate) {
  const rate = Number(mntRate);
  if (locale === 'mn' && Number.isFinite(rate) && rate > 0) {
    const mnt = Math.floor((Number(n || 0) * rate) / 1000) * 1000;
    return `${mnt.toLocaleString('en-US')}₮`;
  }
  return money(n);
}

// Hook: `const m = useMoney(); m(product.price)` — formats for the active locale.
export function useMoney() {
  const { locale, mntRate } = useLocale();
  return (n) => formatMoney(n, locale, mntRate);
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
