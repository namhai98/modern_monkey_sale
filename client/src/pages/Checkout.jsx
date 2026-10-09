import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../lib/apiError';
import client from '../api/client';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Button from '../components/Button';
import Field, { FormMessage } from '../components/Field';
import Icon from '../components/Icon';
import LineItem, { OrderSummary } from '../components/LineItem';
import PageHero from '../components/PageHero';
import EmptyState from '../components/EmptyState';
import Section from '../components/Section';

export default function Checkout() {
  const { items, total, clearCart, syncPrices } = useCart();
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const { info } = useToast();
  useDocumentTitle(t('checkout.title'));
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', phone: '', line1: '', city: '', postcode: '', country: '' });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Same as the bag: re-read live prices on arrival, so the total a shopper
  // confirms is the one the server will charge (discounts can end mid-visit).
  useEffect(() => {
    syncPrices().then((n) => {
      if (n) info(t('cart.pricesUpdated'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <EmptyState
        eyebrow={t('checkout.title')}
        title={t('checkout.emptyBag')}
        actions={<Button to="/shop?all=1">{t('cart.continue')}</Button>}
      />
    );
  }

  const subtotal = items.reduce((n, i) => n + (i.original_price ?? i.price) * i.quantity, 0);

  async function placeOrder(e) {
    e.preventDefault();
    setPlacing(true);
    setError(null);
    // The order API has a single free-text address field; the phone number
    // rides in it as its own labelled line so staff see it with the address.
    const shipping_address = [
      form.name,
      `${t('checkout.phone')}: ${form.phone.trim()}`,
      form.line1,
      `${form.postcode} ${form.city}`.trim(),
      form.country,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      const { data } = await client.post('/orders', {
        items: items.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
          ...(i.variant_id ? { variant_id: i.variant_id } : {}),
        })),
        shipping_address,
      });
      clearCart();
      // ?placed=1 rather than router state: the confirmation survives a
      // refresh or a shared link instead of silently disappearing.
      navigate(`/orders/${data.id}?placed=1`);
    } catch (err) {
      setError(apiErrorMessage(err, { t, locale, fallbackKey: 'checkout.fail' }));
    } finally {
      setPlacing(false);
    }
  }

  return (
    <>
      <PageHero compact eyebrow={t('checkout.step.details')} title={t('checkout.title')}>
        {/* Step rail — micro-type with the current step in gold, the single
            signal this design uses for "you are here". */}
        <ol className="micro mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
          <li>{t('checkout.step.bag')}</li>
          <li aria-hidden="true">—</li>
          <li aria-current="step" className="text-gold">
            {t('checkout.step.details')}
          </li>
          <li aria-hidden="true">—</li>
          <li>{t('checkout.step.confirm')}</li>
        </ol>
      </PageHero>

      <Section containerClassName="lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-16 xl:gap-20">
        <div>
          <p className="text-sm text-muted">{t('checkout.signedIn', { email: user?.email })}</p>

          <form onSubmit={placeOrder} className="mt-10 space-y-10">
            <div>
              <p className="eyebrow mb-6">{t('checkout.shippingAddress')}</p>
              {/* Every field carries a real visible label — a shopper filling in
                  an address needs to see what each line is once they've typed in
                  it, which a placeholder alone can't do. */}
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field
                    label={t('checkout.fullName')}
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    autoComplete="name"
                    required
                  />
                  {/* The boutique confirms every order by phone — so it is
                      required, and at least the 8 digits of a local number. */}
                  <Field
                    label={t('checkout.phone')}
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    autoComplete="tel"
                    minLength={8}
                    required
                  />
                </div>
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

            {/* How payment works, said plainly before the button — not a
                footnote after it. */}
            <div className="flex gap-3 border border-line bg-surface p-5">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <p className="text-sm leading-relaxed text-muted">{t('checkout.demoNote')}</p>
            </div>

            <FormMessage>{error}</FormMessage>

            <Button as="button" type="submit" disabled={placing} full size="lg">
              {placing ? t('checkout.placing') : t('checkout.place')}
            </Button>
          </form>
        </div>

        {/* Sticky on desktop: the order stays in view the whole way down the
            form. */}
        <aside className="mt-16 border-t border-line pt-10 lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:mt-0 lg:border-l lg:border-t-0 lg:pl-14 lg:pt-0">
          <p className="eyebrow mb-2">{t('checkout.yourOrder')}</p>
          <div className="divide-y divide-line border-b border-line">
            {items.map((i) => (
              <LineItem
                key={`${i.id}:${i.variant_id ?? ''}`}
                name={i.name}
                image={i.image_url}
                variantLabel={i.variant_label}
                quantity={i.quantity}
                price={i.price}
                originalPrice={i.original_price}
              />
            ))}
          </div>
          <OrderSummary className="mt-8" subtotal={subtotal} total={total} />
          <p className="mt-6 text-xs leading-relaxed text-muted">{t('checkout.trust')}</p>
        </aside>
      </Section>
    </>
  );
}
