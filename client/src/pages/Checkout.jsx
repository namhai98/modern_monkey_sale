import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import client from '../api/client';
import { resizeUnsplash } from '../lib/media';
import { money } from '../lib/price';
import Button from '../components/Button';
import ImageFallback from '../components/ImageFallback';

const field =
  'w-full bg-transparent border-b border-line py-3 text-sm placeholder:text-stone focus:outline-none focus:border-ink transition-colors';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', line1: '', city: '', postcode: '', country: '' });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center text-stone">{t('checkout.emptyBag')}</div>
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
        items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
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
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 lg:grid lg:grid-cols-[1fr_380px] lg:gap-16 xl:gap-20">
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 eyebrow text-stone mb-8 md:mb-10">
          <span>{t('checkout.step.bag')}</span><span>—</span>
          <span className="text-ink">{t('checkout.step.details')}</span><span>—</span>
          <span>{t('checkout.step.confirm')}</span>
        </div>
        <h1 className="font-display text-4xl mb-2">{t('checkout.title')}</h1>
        <p className="text-sm text-stone mb-10">{t('checkout.signedIn', { email: user?.email })}</p>

        <form onSubmit={placeOrder} className="space-y-10">
          <div>
            <p className="eyebrow text-stone mb-4">{t('checkout.shippingAddress')}</p>
            <div className="space-y-5">
              <input className={field} placeholder={t('checkout.fullName')} value={form.name}
                onChange={(e) => set('name', e.target.value)} required />
              <input className={field} placeholder={t('checkout.address')} value={form.line1}
                onChange={(e) => set('line1', e.target.value)} required />
              <div className="grid grid-cols-2 gap-5">
                <input className={field} placeholder={t('checkout.postcode')} value={form.postcode}
                  onChange={(e) => set('postcode', e.target.value)} required />
                <input className={field} placeholder={t('checkout.city')} value={form.city}
                  onChange={(e) => set('city', e.target.value)} required />
              </div>
              <input className={field} placeholder={t('checkout.country')} value={form.country}
                onChange={(e) => set('country', e.target.value)} required />
            </div>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <Button as="button" type="submit" disabled={placing} full size="lg">
            {placing ? t('checkout.placing') : t('checkout.place')}
          </Button>
          <p className="text-xs text-stone">{t('checkout.demoNote')}</p>
        </form>
      </div>

      <aside className="mt-16 lg:mt-0 border-t lg:border-t-0 lg:border-l border-line pt-10 lg:pt-0 lg:pl-14">
        <p className="eyebrow text-stone mb-6">{t('checkout.yourOrder')}</p>
        <div className="space-y-5">
          {items.map((i) => (
            <div key={i.id} className="flex gap-4">
              <div className="h-20 w-16 bg-ivory shrink-0 overflow-hidden">
                <ImageFallback src={resizeUnsplash(i.image_url, 150)} alt={i.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-display text-base">{i.name}</p>
                <p className="text-stone">{t('checkout.qty', { n: i.quantity })}</p>
                {i.original_price > i.price && (
                  <p className="text-xs text-stone/60">
                    <s>{money(i.original_price)}</s> {money(i.price)}
                  </p>
                )}
              </div>
              <p className="text-sm text-stone">{money(i.price * i.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="flex items-baseline justify-between border-t border-line mt-8 pt-6">
          <span className="eyebrow">{t('checkout.total')}</span>
          <span className="font-display text-2xl">{money(total)}</span>
        </div>
        <p className="mt-6 text-xs text-stone">{t('checkout.trust')}</p>
      </aside>
    </div>
  );
}
