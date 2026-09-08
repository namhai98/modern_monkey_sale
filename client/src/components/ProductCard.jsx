import { Link } from 'react-router-dom';
import { resizeUnsplash } from '../lib/media';
import { useLocale } from '../context/LocaleContext';
import { categoryLabel } from '../lib/i18n';
import { useMoney, isDiscounted, discountPercent } from '../lib/price';
import ImageFallback from './ImageFallback';

export default function ProductCard({ product }) {
  const { t, locale } = useLocale();
  const money = useMoney();
  const soldOut = product.stock <= 0;
  const onSale = isDiscounted(product);

  const primary = product.images?.[0];
  const secondary = product.images?.[1];
  const cardSrc = primary?.card || resizeUnsplash(product.image_url, 800);
  const hoverSrc = secondary?.card;

  return (
    <Link to={`/products/${product.id}`} className="group block">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ivory">
        <ImageFallback
          src={cardSrc}
          alt={product.name}
          className={`h-full w-full object-cover transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
            hoverSrc ? 'duration-700 group-hover:opacity-0' : 'duration-700 group-hover:scale-[1.03]'
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

        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
          <span className="bg-canvas/95 text-ink eyebrow px-6 py-2.5">{t('product.view')}</span>
        </div>

        {soldOut && (
          <span className="absolute top-3 left-3 eyebrow text-stone bg-canvas/90 px-2 py-1">
            {t('product.soldOut')}
          </span>
        )}
        {onSale && !soldOut && (
          <span className="absolute top-3 right-3 eyebrow text-[0.6rem] bg-ink text-canvas px-2 py-1">
            −{discountPercent(product)}%
          </span>
        )}
      </div>

      <div className="pt-4 text-center">
        {(product.brand || product.category) && (
          <p className="eyebrow text-[0.6rem] text-stone mb-1">
            {product.brand || categoryLabel(locale, product.category)}
          </p>
        )}
        <h3 className="font-display text-xl leading-snug">{product.name}</h3>
        {onSale ? (
          <p className="text-sm mt-1 flex items-center justify-center gap-2">
            <s className="text-stone/50">{money(product.price)}</s>
            <span className="text-ink">{money(product.final_price)}</span>
          </p>
        ) : (
          <p className="text-sm text-stone mt-1">{money(product.price)}</p>
        )}
        {!soldOut && product.low_stock && (
          <p className="text-[0.6rem] uppercase tracking-[0.2em] text-champagne mt-1">
            {t('product.lowStock')}
          </p>
        )}
      </div>
    </Link>
  );
}
