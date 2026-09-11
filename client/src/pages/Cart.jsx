import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { resizeUnsplash } from '../lib/media';
import { useMoney } from '../lib/price';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Button from '../components/Button';
import ImageFallback from '../components/ImageFallback';
import PageHero from '../components/PageHero';
import Price from '../components/Price';
import QuantityStepper from '../components/QuantityStepper';
import EmptyState from '../components/EmptyState';
import { Container } from '../components/Section';

export default function Cart() {
  const { items, updateQuantity, removeItem, total, syncPrices, lineKey } = useCart();
  const { t } = useLocale();
  const { info } = useToast();
  const money = useMoney();
  const navigate = useNavigate();
  useDocumentTitle(t('cart.title'));

  useEffect(() => {
    syncPrices().then((n) => {
      if (n) info(t('cart.pricesUpdated'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <>
      <PageHero
        compact
        eyebrow={t('cart.count', { n: count })}
        title={t('cart.title')}
        crumbs={[{ label: t('cart.title') }]}
      />

      <Container className="max-w-3xl py-14 md:py-20">
        {items.length === 0 ? (
          <EmptyState
            inline
            title={t('cart.empty')}
            body={t('shop.emptyHint')}
            actions={<Button to="/shop?all=1">{t('cart.continue')}</Button>}
          />
        ) : (
          <>
            <div className="divide-y divide-line border-y border-line">
              {items.map((item) => {
                const key = lineKey(item.id, item.variant_id);
                return (
                  <div key={key} className="flex gap-5 py-7 md:gap-6">
                    <div className="h-36 w-28 shrink-0 overflow-hidden bg-surface">
                      <ImageFallback
                        src={resizeUnsplash(item.image_url, 200)}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="heading-serif text-xl leading-snug">{item.name}</p>
                          {item.variant_label && (
                            <p className="micro mt-1.5 tracking-[0.2em] text-muted">
                              {item.variant_label}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-muted">
                            {t('cart.each', { price: money(item.price) })}
                          </p>
                        </div>
                        <Price
                          price={item.price * item.quantity}
                          originalPrice={item.original_price * item.quantity}
                          size="md"
                          className="shrink-0 text-right"
                        />
                      </div>
                      <div className="mt-auto flex items-center gap-6 pt-5">
                        <QuantityStepper
                          value={item.quantity}
                          size="sm"
                          onChange={(n) => updateQuantity(key, n)}
                          labels={{ decrease: t('cart.decrease'), increase: t('cart.increase') }}
                        />
                        <button
                          onClick={() => removeItem(key)}
                          className="link-lux micro text-muted transition-colors hover:text-gold"
                        >
                          {t('cart.remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex items-baseline justify-between">
              <span className="micro text-muted">{t('cart.subtotal')}</span>
              <span className="heading-serif text-3xl tabular-nums">{money(total)}</span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">{t('cart.calcNote')}</p>

            <div className="mt-10 flex flex-wrap gap-5">
              <Button size="lg" className="flex-1" onClick={() => navigate('/checkout')}>
                {t('cart.checkout')}
              </Button>
              <Button to="/shop?all=1" variant="outline-dark" size="lg">
                {t('cart.continue')}
              </Button>
            </div>
          </>
        )}
      </Container>
    </>
  );
}
