import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
import EmptyState from '../components/EmptyState';
import { useMoney } from '../lib/price';
import { recentOrder, rememberOrder } from '../lib/lastOrder';
import Select from '../components/Select';
import { LIMITS, fieldError, onlyDigits, validateCheckout } from '../lib/checkoutValidation';
import { CITIES, UB, districtsOf, isCapital, khoroosOf } from '../lib/mnRegions';

export default function Checkout() {
  const { items, total, clearCart, syncPrices } = useCart();
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const money = useMoney();
  const { info } = useToast();
  useDocumentTitle(t('checkout.title'));
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: '',
    city: UB,
    district: '',
    khoroo: '',
    detail: '',
    label: '',
  });
  // Message keys by field. A field is checked when it is left, re-checked on
  // every change once it has shown an error, and all of them on submit.
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  // Whether the order is paid online (QPay) or settled by phone, said before
  // the button. Unknown until the server answers, so the note waits for it.
  const [qpay, setQpay] = useState(null);
  const set = (k, v) =>
    setForm((f) => {
      const next = { ...f, [k]: v };
      // A new city or district invalidates what was chosen under the old one.
      if (k === 'city') Object.assign(next, { district: '', khoroo: '' });
      if (k === 'district') next.khoroo = '';
      if (errors[k]) setErrors((e) => ({ ...e, [k]: fieldError(k, next) }));
      return next;
    });
  // Leaving a field checks what was typed; an empty field is only called out
  // on submit. Flagging it on blur would push the button down mid-click.
  const check = (k) => {
    if (!String(form[k] ?? '').trim() && !errors[k]) return;
    setErrors((e) => ({ ...e, [k]: fieldError(k, form) }));
  };
  const msg = (k) => (errors[k] ? t(errors[k]) : undefined);
  // Props for a text field: name (for focusing), value, change and blur.
  const bind = (k) => ({
    name: k,
    value: form[k],
    onChange: (e) => set(k, e.target.value),
    onBlur: () => check(k),
    maxLength: LIMITS[k],
    error: msg(k),
  });

  // Same as the bag: re-read live prices on arrival, so the total a shopper
  // confirms is the one the server will charge (discounts can end mid-visit).
  useEffect(() => {
    syncPrices().then((n) => {
      if (n) info(t('cart.pricesUpdated'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    client
      .get('/payments/methods')
      .then(({ data }) => setQpay(Boolean(data.qpay)))
      .catch(() => setQpay(false));
  }, []);

  if (items.length === 0) {
    // Back from the order just placed: the bag is empty because it became
    // that order, so show the order rather than an empty checkout.
    const placed = recentOrder();
    if (placed) return <Navigate to={`/orders/${placed}`} replace />;
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
    const found = validateCheckout(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      setError(null);
      document.querySelector(`[name="${first}"], #checkout-${first}`)?.focus();
      return;
    }
    setPlacing(true);
    setError(null);
    // The order API has a single free-text address field. It is written for
    // the courier, in Mongolian: who, how to call, where, then the detail.
    const v = Object.fromEntries(Object.entries(form).map(([k, x]) => [k, String(x).trim()]));
    const area = [v.city, `${v.district} ${isCapital(v.city) ? 'дүүрэг' : 'сум'}`, v.khoroo].filter(Boolean).join(', ');
    const shipping_address = [
      v.name,
      `Утас: ${v.phone}`,
      area,
      v.detail,
      v.label && `Хаягийн нэр: ${v.label}`,
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
      rememberOrder(data.id);
      // ?placed=1 rather than router state: the confirmation survives a
      // refresh or a shared link instead of silently disappearing. replace:
      // checkout leaves the history, so Back from the order skips the form
      // that has nothing left to submit.
      navigate(`/orders/${data.id}?placed=1`, { replace: true });
      clearCart();
    } catch (err) {
      setError(apiErrorMessage(err, { t, locale, fallbackKey: 'checkout.fail' }));
    } finally {
      setPlacing(false);
    }
  }

  return (
    /* One screen on a tablet or computer: a slim title row instead of a page
       hero, the fields in a grid rather than a column, and the order beside
       them. A phone scrolls, as it must. */
    <section className="container-lux py-6 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pb-5 lg:border-b lg:border-line">
        <h1 className="heading-serif text-3xl leading-[1.05] md:text-4xl">{t('checkout.title')}</h1>
        {/* Step rail — micro-type with the current step in gold, the single
            signal this design uses for "you are here". */}
        <ol className="micro flex flex-wrap items-center gap-x-4 gap-y-2 text-muted max-sm:tracking-[0.14em] sm:gap-x-5">
          <li className="inline-flex items-center gap-2">
            <span className="tabular-nums">1</span>
            {t('checkout.step.bag')}
          </li>
          <li aria-current="step" className="inline-flex items-center gap-2 text-gold">
            <span className="tabular-nums">2</span>
            {t('checkout.step.details')}
          </li>
          <li className="inline-flex items-center gap-2">
            <span className="tabular-nums">3</span>
            {t('checkout.step.confirm')}
          </li>
        </ol>
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-14 xl:gap-20">
        <details className="group mb-6 border-y border-line lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
            <span className="micro tracking-meta text-muted">
              {t('checkout.yourOrder')} · {t('checkout.itemCount', { n: items.reduce((n, i) => n + i.quantity, 0) })}
            </span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums text-foreground">{money(total)}</span>
              <Icon name="chevronDown" className="h-4 w-4 text-muted transition-transform duration-300 group-open:rotate-180" />
            </span>
          </summary>
          <div className="divide-y divide-line border-t border-line">
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
          <OrderSummary className="mb-6 mt-6" subtotal={subtotal} total={total} />
        </details>

        {/* noValidate: the browser's own bubbles vanish on scroll and speak
            the browser's language; these sit under their field, in the shop's. */}
        <form onSubmit={placeOrder} noValidate className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="eyebrow">{t('checkout.shippingAddress')}</p>
            <p className="text-xs text-muted">{t('checkout.signedIn', { email: user?.email })}</p>
          </div>

          {/* Every field carries a real visible label — a shopper filling in an
              address needs to see what each line is once they've typed in it.
              Six columns on a computer: name and phone, then city, district and
              khoroo across one row, then the address beside its name. Two on a
              tablet, with the address last and full width. */}
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-6">
            <Field className="lg:col-span-3" label={t('checkout.fullName')} autoComplete="name" required {...bind('name')} />
            {/* Eight digits, nothing else: the field drops anything that isn't
                a digit as it is typed or pasted. */}
            <Field
              className="lg:col-span-3"
              label={t('checkout.phone')}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="99112233"
              required
              {...bind('phone')}
              onChange={(e) => set('phone', onlyDigits(e.target.value))}
            />
            <Field
              className="lg:col-span-2"
              id="checkout-city"
              label={t('checkout.cityAimag')}
              required
              error={msg('city')}
              control={
                <Select value={form.city} onChange={(e) => set('city', e.target.value)}>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              }
            />
            <Field
              className="lg:col-span-2"
              id="checkout-district"
              label={t('checkout.districtSum')}
              required
              error={msg('district')}
              control={
                <Select
                  value={form.district}
                  placeholder={t('checkout.choose')}
                  onChange={(e) => set('district', e.target.value)}
                >
                  {districtsOf(form.city).map((d) => (
                    <option key={d} value={d}>
                      {`${d} ${isCapital(form.city) ? t('checkout.districtWord') : t('checkout.sumWord')}`}
                    </option>
                  ))}
                </Select>
              }
            />
            {/* The capital's khoroos are numbered, so they are a list; an
                aimag's bags are many and often named, so they are typed. */}
            {isCapital(form.city) ? (
              <Field
                className="lg:col-span-2"
                id="checkout-khoroo"
                label={t('checkout.khorooBag')}
                required
                error={msg('khoroo')}
                control={
                  <Select
                    value={form.khoroo}
                    placeholder={t('checkout.choose')}
                    disabled={!form.district}
                    onChange={(e) => set('khoroo', e.target.value)}
                  >
                    {(khoroosOf(form.city, form.district) || []).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </Select>
                }
              />
            ) : (
              <Field
                className="lg:col-span-2"
                label={t('checkout.khorooBag')}
                placeholder={t('checkout.bagPlaceholder')}
                required
                {...bind('khoroo')}
              />
            )}
            <Field
              className="md:order-last md:col-span-2 lg:order-none lg:col-span-4 [&_textarea]:resize-y"
              as="textarea"
              rows={2}
              label={t('checkout.detail')}
              placeholder={t('checkout.detailPlaceholder')}
              autoComplete="street-address"
              required
              {...bind('detail')}
            />
            <Field
              className="lg:col-span-2"
              label={t('checkout.addressLabel')}
              placeholder={t('checkout.addressLabelPlaceholder')}
              hint={t('checkout.optional')}
              {...bind('label')}
            />
          </div>

          {/* How payment works, said plainly before the button — not a
              footnote after it. */}
          <div className="flex gap-3 border border-line bg-surface px-4 py-3">
            <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <p className="min-h-[1.25rem] text-sm leading-relaxed text-muted">
              {qpay === null ? '' : t(qpay ? 'checkout.qpayNote' : 'checkout.demoNote')}
            </p>
          </div>

          {/* The summary line stays only while a field is still marked. */}
          <FormMessage>{error || (Object.values(errors).some(Boolean) ? t('checkout.err.form') : null)}</FormMessage>

          <Button as="button" type="submit" disabled={placing} full size="lg">
            {placing ? t('checkout.placing') : t('checkout.place')}
          </Button>
        </form>

        {/* Sticky on desktop: the order stays in view the whole way down the
            form. */}
        <aside className="hidden lg:sticky lg:block lg:top-[calc(var(--header-h)+1.5rem)] lg:mt-0 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <p className="eyebrow mb-2">{t('checkout.yourOrder')}</p>
          {/* A long bag scrolls inside its own list, so the column keeps to one screen. */}
          <div className="max-h-[40svh] divide-y divide-line overflow-y-auto border-b border-line">
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
          <OrderSummary className="mt-6" subtotal={subtotal} total={total} />
          <p className="mt-6 text-xs leading-relaxed text-muted">{t('checkout.trust')}</p>
        </aside>
      </div>
    </section>
  );
}
