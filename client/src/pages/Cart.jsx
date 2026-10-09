import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Button from '../components/Button';
import LineItem, { OrderSummary } from '../components/LineItem';
import PageHero from '../components/PageHero';
import QuantityStepper from '../components/QuantityStepper';
import EmptyState from '../components/EmptyState';
import Section from '../components/Section';
import TextButton from '../components/TextButton';

export default function Cart() {
  const { items, updateQuantity, removeItem, total, syncPrices, lineKey } = useCart();
  const { t } = useLocale();
  const { info } = useToast();
  const navigate = useNavigate();
  useDocumentTitle(t('cart.title'));

  useEffect(() => {
    syncPrices().then((n) => {
      if (n) info(t('cart.pricesUpdated'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((n, i) => n + (i.original_price ?? i.price) * i.quantity, 0);

  return (
    <>
      <PageHero
        compact
        eyebrow={t('cart.count', { n: count })}
        title={t('cart.title')}
        crumbs={[{ label: t('cart.title') }]}
      />

      <Section containerClassName="max-w-3xl">
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
                  <LineItem
                    key={key}
                    size="md"
                    showEach
                    name={item.name}
                    image={item.image_url}
                    variantLabel={item.variant_label}
                    quantity={item.quantity}
                    price={item.price}
                    originalPrice={item.original_price}
                    controls={
                      <>
                        <QuantityStepper
                          value={item.quantity}
                          size="sm"
                          onChange={(n) => updateQuantity(key, n)}
                        />
                        <TextButton onClick={() => removeItem(key)}>{t('cart.remove')}</TextButton>
                      </>
                    }
                  />
                );
              })}
            </div>

            <OrderSummary className="mt-10" subtotal={subtotal} total={total} />
            <p className="mt-4 text-xs leading-relaxed text-muted">{t('cart.calcNote')}</p>

            {/* Stacked full width on a phone — side by side, the checkout label
                broke over three lines in half the row. */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-5">
              <Button size="lg" className="sm:flex-1" onClick={() => navigate('/checkout')}>
                {t('cart.checkout')}
              </Button>
              <Button to="/shop?all=1" variant="outline-dark" size="lg">
                {t('cart.continue')}
              </Button>
            </div>
          </>
        )}
      </Section>
    </>
  );
}
