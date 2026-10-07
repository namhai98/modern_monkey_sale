import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { resizeUnsplash } from '../lib/media';
import { useMoney } from '../lib/price';
import { useFocusTrap } from '../lib/useFocusTrap';
import Button from './Button';
import EmptyState from './EmptyState';
import ImageFallback from './ImageFallback';
import Price from './Price';
import QuantityStepper from './QuantityStepper';
import TextButton from './TextButton';

/* CSS-transition drawer — always mounted, toggled by class. Cannot get stuck
   mid-animation the way a JS-animation-library drawer can.

   Overlay vocabulary follows the presentation site: the scrim is always ink
   plus a blur, never a neutral grey, and the panel is held off the page by a
   hairline rather than a drop shadow. */
export default function CartDrawer() {
  const { cartOpen, closeCart } = useUI();
  const { items, updateQuantity, removeItem, total, syncPrices, lineKey } = useCart();
  const { t } = useLocale();
  const { info } = useToast();
  const money = useMoney();
  const navigate = useNavigate();
  const panelRef = useFocusTrap(cartOpen);

  // Refresh prices whenever the drawer opens — discounts may have changed.
  useEffect(() => {
    if (!cartOpen) return;
    syncPrices().then((n) => {
      if (n) info(t('cart.pricesUpdated'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartOpen]);

  // Escape closes, as it must for anything role="dialog".
  useEffect(() => {
    if (!cartOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeCart();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cartOpen, closeCart]);

  function go(path) {
    closeCart();
    navigate(path);
  }

  const count = items.reduce((n, i) => n + i.quantity, 0);

  return (
    /* inert, not aria-hidden: the drawer stays mounted while closed, and
       aria-hidden alone left every control in it reachable with Tab. */
    <div className={`fixed inset-0 z-[60] ${cartOpen ? '' : 'pointer-events-none'}`} inert={!cartOpen}>
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-ink/80 backdrop-blur-sm transition-opacity duration-500 ${
          cartOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t('cart.title')}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-background outline-none transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          cartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Same height as the site header, so opening the drawer doesn't shift
            the eye line. */}
        <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-line px-6">
          <span className="eyebrow">{t('cart.count', { n: count })}</span>
          <TextButton onClick={closeCart}>{t('nav.close')}</TextButton>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              inline
              eyebrow={t('cart.count', { n: 0 })}
              title={t('cart.empty')}
              actions={
                <TextButton tone="gold" onClick={() => go('/shop?all=1')}>
                  {t('cart.continue')}
                </TextButton>
              }
            />
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-line overflow-y-auto px-6">
              {items.map((item) => {
                const key = lineKey(item.id, item.variant_id);
                return (
                  <div key={key} className="flex gap-4 py-6">
                    <div className="h-28 w-22 shrink-0 overflow-hidden bg-surface">
                      <ImageFallback
                        src={resizeUnsplash(item.image_url, 200)}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-catalog text-product font-medium leading-snug">{item.name}</p>
                      {item.variant_label && (
                        <p className="micro mt-1.5 tracking-meta text-muted">{item.variant_label}</p>
                      )}
                      <Price
                        price={item.price}
                        originalPrice={item.original_price}
                        className="mt-2"
                      />
                      <div className="mt-4 flex items-center gap-5">
                        <QuantityStepper
                          value={item.quantity}
                          size="sm"
                          onChange={(n) => updateQuantity(key, n)}
                        />
                        <TextButton onClick={() => removeItem(key)}>{t('cart.remove')}</TextButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 space-y-5 border-t border-line px-6 py-6">
              <div className="flex items-baseline justify-between">
                <span className="micro text-muted">{t('cart.subtotal')}</span>
                <span className="heading-serif text-2xl tabular-nums">{money(total)}</span>
              </div>
              <p className="text-xs leading-relaxed text-muted">{t('cart.calcNote')}</p>
              <Button full onClick={() => go('/checkout')}>
                {t('cart.checkout')}
              </Button>
              <TextButton onClick={() => go('/cart')} className="mx-auto block">
                {t('cart.title')}
              </TextButton>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
