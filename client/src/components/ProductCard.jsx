import { Link } from 'react-router-dom';
import { resizeUnsplash, unsplashSrcSet } from '../lib/media';
import { useLocale } from '../context/LocaleContext';
import { categoryLabel } from '../lib/i18n';
import { isDiscounted, discountPercent } from '../lib/price';
import Price from './Price';
import ImageFallback from './ImageFallback';
import HeartButton from './HeartButton';

/* The presentation site's product card, as-is: a 4/5 frame whose media scales
   while the card itself stays put, a caption panel that slides up from the
   bottom edge on hover, then a meta row underneath — serif name and category
   line on the left, price on the right.

   Three house rules shape what is NOT here: the card never scales and never
   lifts into a shadow (elevation is border + blur); a status is gold text
   behind a hairline, never a filled coloured pill; and the whole thing is
   square-cornered. */
export default function ProductCard({ product }) {
  const { t, locale } = useLocale();
  const soldOut = product.stock <= 0;
  const onSale = isDiscounted(product);

  const primary = product.images?.[0];
  const secondary = product.images?.[1];
  const cardSrc = primary?.card || resizeUnsplash(product.image_url, 800);
  const hoverSrc = secondary?.card;
  // The grids this card sits in run 2 columns on phones up to 4–5 on desktop;
  // with a srcSet the browser fetches the smallest file that is sharp for that
  // slot. (Uploaded images have no width variants here, so they keep `src`.)
  const sizes = '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw';

  // The heart is a sibling of the link, not inside it (a button can't live in
  // an <a>), laid over the photo's bottom-right corner by a frame of the same
  // 4/5 shape. `group` sits on the wrapper so hovering the heart still counts
  // as hovering the card.
  return (
    <div className="group relative">
      <Link to={`/products/${product.id}`} className="block">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface">
          <ImageFallback
            src={cardSrc}
            srcSet={unsplashSrcSet(cardSrc, [400, 600, 800])}
            sizes={sizes}
            alt={product.name}
            className={`h-full w-full object-cover transition-all duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              hoverSrc ? 'group-hover:opacity-0' : 'group-hover:scale-[1.05]'
            }`}
          />
          {hoverSrc && (
            <img
              src={hoverSrc}
              srcSet={unsplashSrcSet(hoverSrc, [400, 600, 800])}
              sizes={sizes}
              alt=""
              loading="lazy"
              decoding="async"
              aria-hidden="true"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
            />
          )}

          {/* Sold out reads as a state of the whole image, not a corner sticker —
              a shopper should register it before reading the name. */}
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/55">
              <span className="micro border border-white/25 px-4 py-2 text-white/80 backdrop-blur">
                {t('product.soldOut')}
              </span>
            </div>
          )}

          {onSale && !soldOut && (
            <span className="micro absolute left-0 top-0 border-b border-r border-gold/40 bg-ink/80 px-3 py-1.5 tracking-meta text-gold backdrop-blur">
              −{discountPercent(product)}%
            </span>
          )}

          {/* Low stock mirrors the sale tag in the opposite corner — the same
              ink chip and gold hairline, so a piece on sale and nearly gone
              carries one tag on each side. The label is kept to one short word
              so both fit side by side even on a phone's two-up grid. */}
          {!soldOut && product.low_stock && (
            <span className="micro absolute right-0 top-0 border-b border-l border-gold/40 bg-ink/80 px-3 py-1.5 tracking-meta text-gold backdrop-blur">
              {t('product.lowStock')}
            </span>
          )}

          {/* Caption panel — slides up from the bottom edge on hover. */}
          {!soldOut && (
            <div className="absolute inset-x-0 bottom-0 translate-y-full bg-ink/85 p-4 text-center backdrop-blur transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0">
              <span className="micro tracking-button text-gold">{t('product.view')}</span>
            </div>
          )}
        </div>

        {/* On a phone the meta is a column — name, house, price — because a
            two-up card is ~170px wide and a name beside a tögrög price broke
            one word per line. From sm it is the side-by-side row. */}
        <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            {/* Montserrat carries a large x-height, so it reads a size bigger
                than it is set — the name sits a notch below the serif it
                replaced rather than matching its nominal size. */}
            <h3 className="font-catalog text-product font-medium leading-snug transition-colors duration-300 group-hover:text-gold md:text-base">
              {product.name}
            </h3>
            {(product.brand || product.category) && (
              <p className="font-catalog mt-1.5 truncate text-meta uppercase tracking-meta text-muted">
                {product.brand?.name || categoryLabel(locale, product.category)}
              </p>
            )}
          </div>
          {/* Stacked so a sale pair stays one price wide. The name owns the rest
              of the row; in a two-up grid there is no version of this row where a
              side-by-side pair and a serif name both fit. */}
          <Price product={product} stack="sm" className="shrink-0 sm:pt-0.5 sm:text-right" />
        </div>
      </Link>
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/5]">
        <div className="pointer-events-auto absolute bottom-2 right-2 z-10">
          <HeartButton productId={product.id} />
        </div>
      </div>
    </div>
  );
}
