import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import client from '../api/client';
import { resizeUnsplash } from '../lib/media';
import { useMoney } from '../lib/price';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Button from '../components/Button';
import ImageFallback from '../components/ImageFallback';
import Field, { FormMessage } from '../components/Field';
import Price from '../components/Price';
import PageHero from '../components/PageHero';
import EmptyState from '../components/EmptyState';
import { Container } from '../components/Section';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const { t } = useLocale();
  useDocumentTitle(t('checkout.title'));
  const money = useMoney();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', line1: '', city: '', postcode: '', country: '' });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (items.length === 0) {
    return (
      <EmptyState
        eyebrow={t('checkout.title')}
        title={t('checkout.emptyBag')}
        actions={<Button to="/shop?all=1">{t('cart.continue')}</Button>}
      />
    );
  }

  async function placeOrder(e) {
    e.preventDefault();
    setPlacing(true);
    setError(null);
    const shipping_address = [
      form.name,
      form.line1,
      `${form.postcode} ${form.city}`.trim(),
      form.country,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await client.post('/orders', {
        items: items.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
          ...(i.variant_id ? { variant_id: i.variant_id } : {}),
        })),
        shipping_address,
      });
      clearCart();
      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.error || t('checkout.fail'));
    } finally {
      setPlacing(false);
    }
  }

  return (
    <>
      <PageHero compact eyebrow={t('checkout.step.details')} title={t('checkout.title')}>
        {/* Step rail — micro-type with the current step in gold, the single
            signal this design uses for "you are here". */}
        <ol className="micro mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-white/45">
          <li>{t('checkout.step.bag')}</li>
          <li aria-hidden="true">—</li>
          <li aria-current="step" className="text-gold">
            {t('checkout.step.details')}
          </li>
          <li aria-hidden="true">—</li>
          <li>{t('checkout.step.confirm')}</li>
        </ol>
      </PageHero>

      <Container className="py-14 md:py-20 lg:grid lg:grid-cols-[1fr_380px] lg:gap-16 xl:gap-20">
        <div>
          <p className="text-sm text-muted">{t('checkout.signedIn', { email: user?.email })}</p>

          <form onSubmit={placeOrder} className="mt-10 space-y-10">
            <div>
              <p className="eyebrow mb-6">{t('checkout.shippingAddress')}</p>
              {/* Every field carries a real visible label — a shopper filling in
                  an address needs to see what each line is once they've typed in
                  it, which a placeholder alone can't do. */}
              <div className="space-y-6">
                <Field
                  label={t('checkout.fullName')}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  autoComplete="name"
                  required
                />
                <Field
                  label={t('checkout.address')}
                  value={form.line1}
                  onChange={(e) => set('line1', e.target.value)}
                  autoComplete="address-line1"
                  required
                />
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field
                    label={t('checkout.postcode')}
                    value={form.postcode}
                    onChange={(e) => set('postcode', e.target.value)}
                    autoComplete="postal-code"
                    required
                  />
                  <Field
                    label={t('checkout.city')}
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    autoComplete="address-level2"
                    required
                  />
                </div>
                <Field
                  label={t('checkout.country')}
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                  autoComplete="country-name"
                  required
                />
              </div>
            </div>

            <FormMessage>{error}</FormMessage>

            <Button as="button" type="submit" disabled={placing} full size="lg">
              {placing ? t('checkout.placing') : t('checkout.place')}
            </Button>
            <p className="text-xs leading-relaxed text-muted">{t('checkout.demoNote')}</p>
          </form>
        </div>

        <aside className="mt-16 border-t border-line pt-10 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-14 lg:pt-0">
          <p className="eyebrow mb-6">{t('checkout.yourOrder')}</p>
          <div className="divide-y divide-line border-y border-line">
            {items.map((i) => (
              <div key={`${i.id}:${i.variant_id ?? ''}`} className="flex gap-4 py-5">
                <div className="h-24 w-18 shrink-0 overflow-hidden bg-surface">
                  <ImageFallback
                    src={resizeUnsplash(i.image_url, 150)}
                    alt={i.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="heading-serif text-base leading-snug">{i.name}</p>
                  <p className="micro mt-1.5 tracking-[0.2em] text-muted">
                    {i.variant_label ? `${i.variant_label} · ` : ''}
                    {t('checkout.qty', { n: i.quantity })}
                  </p>
                  <Price
                    price={i.price * i.quantity}
                    originalPrice={i.original_price * i.quantity}
                    className="mt-2"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-baseline justify-between">
            <span className="micro text-muted">{t('checkout.total')}</span>
            <span className="heading-serif text-2xl tabular-nums">{money(total)}</span>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted">{t('checkout.trust')}</p>
        </aside>
      </Container>
    </>
  );
}
