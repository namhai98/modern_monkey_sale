import { useLocale } from '../context/LocaleContext';
import { resizeUnsplash } from '../lib/media';
import { useMoney } from '../lib/price';
import ImageFallback from './ImageFallback';
import Price from './Price';

const PHOTO = {
  sm: 'h-24 w-[4.5rem]', // drawer, checkout summary, order page
  md: 'h-36 w-28', // the bag page
};

/* One order line, the same shape wherever a line appears — the bag page, the
   bag drawer, checkout's summary and an order's own page: photo, name, size,
   the line total (with the pre-discount price struck through when there is
   one), and under it either the quantity or, where the line can still change,
   the `controls` (stepper + remove). */
export default function LineItem({
  name,
  image,
  variantLabel,
  quantity,
  price,
  originalPrice,
  size = 'sm',
  showEach = false,
  controls = null,
}) {
  const { t } = useLocale();
  const money = useMoney();

  return (
    <div className={`flex ${size === 'md' ? 'gap-5 py-7 md:gap-6' : 'gap-4 py-5'}`}>
      <div className={`${PHOTO[size]} shrink-0 overflow-hidden bg-surface`}>
        <ImageFallback
          src={resizeUnsplash(image, size === 'md' ? 240 : 160)}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-catalog text-product font-medium leading-snug md:text-base">{name}</p>
            <p className="micro mt-1.5 tracking-meta text-muted">
              {[variantLabel, controls ? null : t('checkout.qty', { n: quantity })].filter(Boolean).join(' · ')}
            </p>
            {showEach && <p className="mt-2 text-xs text-muted">{t('cart.each', { price: money(price) })}</p>}
          </div>
          <Price
            price={price * quantity}
            originalPrice={(originalPrice ?? price) * quantity}
            stack
            className="shrink-0 text-right"
          />
        </div>
        {controls && <div className={`flex items-center gap-6 ${size === 'md' ? 'mt-auto pt-5' : 'mt-4'}`}>{controls}</div>}
      </div>
    </div>
  );
}

/* The totals block under a list of lines: subtotal at full price, the saving
   when a discount applies, then the total actually charged. */
export function OrderSummary({ subtotal, total, totalLabel, className = '' }) {
  const { t } = useLocale();
  const money = useMoney();
  const saved = Math.max(0, subtotal - total);

  return (
    <dl className={`space-y-3 ${className}`}>
      {saved > 0 && (
        <>
          <div className="flex items-baseline justify-between text-sm">
            <dt className="text-muted">{t('cart.subtotal')}</dt>
            <dd className="tabular-nums">{money(subtotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <dt className="text-muted">{t('cart.youSave')}</dt>
            <dd className="tabular-nums text-gold">−{money(saved)}</dd>
          </div>
        </>
      )}
      <div className={`flex items-baseline justify-between ${saved > 0 ? 'border-t border-line pt-4' : ''}`}>
        <dt className="micro text-muted">{totalLabel || t('checkout.total')}</dt>
        <dd className="heading-serif text-2xl tabular-nums">{money(total)}</dd>
      </div>
    </dl>
  );
}
