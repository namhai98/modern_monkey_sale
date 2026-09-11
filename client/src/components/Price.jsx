import { useMoney, isDiscounted, discountPercent } from '../lib/price';

/* One price treatment for the whole storefront — previously this markup was
   rewritten by hand in the card, the detail page, the bag, the drawer and
   checkout, and each one had drifted.

   The presentation site has no filled status pills: a signal is gold text next
   to a hairline, never a coloured chip. So the saving reads as gold micro-type
   and the live price stays on `foreground`, because in a shop the price is
   content, not decoration, and has to hold its contrast in both themes. */

const SIZES = {
  sm: { now: 'text-sm', was: 'text-sm' },
  md: { now: 'text-base', was: 'text-sm' },
  lg: { now: 'text-xl', was: 'text-base' },
};

export default function Price({
  product,
  price,
  originalPrice,
  size = 'sm',
  showPercent = false,
  // Fixed-dark bands (the search overlay, a hero) are dark in both themes, so
  // they bypass the theme tokens the same way the presentation site's dark
  // bands do.
  tone = 'theme',
  className = '',
}) {
  const money = useMoney();
  const s = SIZES[size] || SIZES.sm;
  const nowColor = tone === 'dark' ? 'text-white' : 'text-foreground';
  const wasColor = tone === 'dark' ? 'text-white/40' : 'text-muted/60';

  // Either hand in a product (the API owns final_price/discount_amount) or an
  // explicit pair — cart lines carry their own captured price/original_price.
  const now = product ? Number(product.final_price ?? product.price) : Number(price);
  const was = product ? Number(product.price) : Number(originalPrice);
  const onSale = product ? isDiscounted(product) : Number.isFinite(was) && was > now;

  if (!onSale) {
    return <span className={`${s.now} ${nowColor} tabular-nums ${className}`}>{money(now)}</span>;
  }

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className={`${s.now} ${nowColor} tabular-nums`}>{money(now)}</span>
      <s className={`${s.was} ${wasColor} tabular-nums`}>{money(was)}</s>
      {showPercent && (
        <span className="micro tracking-[0.2em] text-gold">
          −{product ? discountPercent(product) : Math.round(((was - now) / was) * 100)}%
        </span>
      )}
    </span>
  );
}
