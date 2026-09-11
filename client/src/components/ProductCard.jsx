import { Link } from 'react-router-dom';
import { resizeUnsplash } from '../lib/media';
import { useLocale } from '../context/LocaleContext';
import { categoryLabel } from '../lib/i18n';
import { isDiscounted, discountPercent } from '../lib/price';
import Price from './Price';
import ImageFallback from './ImageFallback';

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

  return (
    <Link to={`/products/${product.id}`} className="group block">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface">
        <ImageFallback
          src={cardSrc}
          alt={product.name}
          className={`h-full w-full object-cover transition-all duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            hoverSrc ? 'group-hover:opacity-0' : 'group-hover:scale-[1.05]'
          }`}
        />
        {hoverSrc && (
          <img
            src={hoverSrc}
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
          <span className="micro absolute left-0 top-0 border-b border-r border-gold/40 bg-ink/80 px-3 py-1.5 tracking-[0.24em] text-gold backdrop-blur">
            −{discountPercent(product)}%
          </span>
        )}

        {/* Caption panel — slides up from the bottom edge on hover. */}
        {!soldOut && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-ink/85 p-4 text-center backdrop-blur transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0">
            <span className="micro tracking-[0.3em] text-gold">{t('product.view')}</span>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="heading-serif text-lg leading-snug transition-colors duration-300 group-hover:text-gold md:text-xl">
            {product.name}
          </h3>
          {(product.brand || product.category) && (
            <p className="mt-1.5 truncate text-xs uppercase tracking-[0.2em] text-muted">
              {product.brand?.name || categoryLabel(locale, product.category)}
            </p>
          )}
          {!soldOut && product.low_stock && (
            <p className="micro mt-2 tracking-[0.24em] text-gold">{t('product.lowStock')}</p>
          )}
        </div>
        <Price product={product} className="shrink-0 pt-0.5 text-right" />
      </div>
    </Link>
  );
}
