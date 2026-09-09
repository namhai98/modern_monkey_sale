import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { resizeUnsplash } from '../lib/media';
import { useMoney } from '../lib/price';
import Button from './Button';
import ImageFallback from './ImageFallback';

// CSS-transition drawer — always mounted, toggled by class. Cannot get stuck
// mid-animation the way a JS-animation-library drawer can.
export default function CartDrawer() {
  const { cartOpen, closeCart } = useUI();
  const { items, updateQuantity, removeItem, total, syncPrices, lineKey } = useCart();
  const { t } = useLocale();
  const { info } = useToast();
  const money = useMoney();
  const navigate = useNavigate();

  // Refresh prices whenever the drawer opens — discounts may have changed.
  useEffect(() => {
    if (!cartOpen) return;
    syncPrices().then((n) => {
      if (n) info(t('cart.pricesUpdated'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartOpen]);

  function go(path) {
    closeCart();
    navigate(path);
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${cartOpen ? '' : 'pointer-events-none'}`}
      aria-hidden={!cartOpen}
    >
      {/* scrim */}
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-ink/30 transition-opacity duration-300 ${
          cartOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-label="Shopping bag"
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-canvas flex flex-col shadow-[-1px_0_0_0_var(--color-line)] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          cartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 h-20 border-b border-line">
          <span className="eyebrow">
            {t('cart.count', { n: items.reduce((n, i) => n + i.quantity, 0) })}
          </span>
          <button onClick={closeCart} aria-label={t('nav.close')} className="text-stone hover:text-ink text-sm">
            {t('nav.close')}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-stone">{t('cart.empty')}</p>
            <button onClick={() => go('/shop')} className="eyebrow link-underline">
              {t('cart.continue')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {items.map((item) => {
                const key = lineKey(item.id, item.variant_id);
                return (
                <div key={key} className="flex gap-4">
                  <div className="h-24 w-20 bg-ivory shrink-0 overflow-hidden">
                    <ImageFallback
                      src={resizeUnsplash(item.image_url, 200)}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg leading-tight">{item.name}</p>
                    {item.variant_label && (
                      <p className="text-[0.65rem] eyebrow text-stone mt-0.5">{item.variant_label}</p>
                    )}
                    <p className="text-sm text-stone mt-1">
                      {item.original_price > item.price && (
                        <s className="text-stone/50 mr-1.5">{money(item.original_price)}</s>
                      )}
                      {money(item.price)}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="inline-flex items-center border border-line">
                        <button
                          className="px-2.5 py-1 text-stone hover:text-ink"
                          onClick={() => updateQuantity(key, Math.max(1, item.quantity - 1))}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="px-2 tabular-nums">{item.quantity}</span>
                        <button
                          className="px-2.5 py-1 text-stone hover:text-ink"
                          onClick={() => updateQuantity(key, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </span>
                      <button
                        onClick={() => removeItem(key)}
                        className="text-stone hover:text-ink link-underline"
                      >
                        {t('cart.remove')}
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="border-t border-line px-6 py-6 space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow">{t('cart.subtotal')}</span>
                <span className="font-display text-xl">{money(total)}</span>
              </div>
              <p className="text-xs text-stone">{t('cart.calcNote')}</p>
              <Button full size="lg" onClick={() => go('/checkout')}>
                {t('cart.checkout')}
              </Button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
