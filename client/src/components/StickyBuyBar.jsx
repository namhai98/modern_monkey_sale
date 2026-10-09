import { useEffect, useState } from 'react';
import Button from './Button';
import Price from './Price';
import { useLocale } from '../context/LocaleContext';

/* Phones and tablets: once the shopper has scrolled past the product page's
   own add-to-bag row (into the description, the related pieces), a slim bar
   holds the price and the button at the bottom of the screen, so buying never
   means scrolling back up. Desktop keeps the info column sticky instead.

   `watchRef` is the page's add-to-bag row; the bar shows only while that row
   is above the viewport. With a size still to choose, the button takes the
   shopper back to the sizes rather than doing nothing. */
export default function StickyBuyBar({ watchRef, product, soldOut, needsSize, added, onAdd, onChooseSize }) {
  const { t } = useLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = watchRef.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [watchRef]);

  // Lift the floating contact buttons clear of the bar while it is up.
  useEffect(() => {
    const root = document.documentElement;
    if (show) root.style.setProperty('--float-lift', '4.75rem');
    else root.style.removeProperty('--float-lift');
    return () => root.style.removeProperty('--float-lift');
  }, [show]);

  if (soldOut) return null;

  return (
    <div
      aria-hidden={!show}
      inert={!show}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl transition-transform duration-500 ease-[var(--ease-luxe)] lg:hidden ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="container-bar flex items-center gap-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">{product.name}</p>
          <Price product={product} className="text-sm" />
        </div>
        <Button size="sm" className="shrink-0" onClick={needsSize ? onChooseSize : onAdd}>
          {needsSize ? t('pdp.chooseSize') : added ? t('pdp.added') : t('pdp.addToBag')}
        </Button>
      </div>
    </div>
  );
}
