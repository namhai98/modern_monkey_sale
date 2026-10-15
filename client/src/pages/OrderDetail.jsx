import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import OrderStatusBadge from '../components/OrderStatusBadge';
import OrderTimeline from '../components/OrderTimeline';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { parseShippingAddress } from '../lib/orderAddress';
import PageHero from '../components/PageHero';
import QPayPanel from '../components/QPayPanel';
import Breadcrumb from '../components/Breadcrumb';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import LineItem, { OrderSummary } from '../components/LineItem';
import Section from '../components/Section';
import Skeleton from '../components/Skeleton';
import TextButton from '../components/TextButton';

// "2026.10.15 11:16" — one unambiguous shape in both languages, no seconds.
function fmtPlaced(value) {
  const d = new Date(value);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* Where the order is going, field by field. The address is stored as one
   block of text (see Checkout); it is read back into labelled rows so it sits
   beside the order list in the same hairlines and rhythm. An older address
   that doesn't follow that shape still shows, line by line, under Address. */
function DeliveryDetails({ address, createdAt, className = '' }) {
  const { t } = useLocale();
  const a = parseShippingAddress(address);
  const detail = a.lines.filter((l) => l !== a.area);
  const rows = [
    ['recipient', a.name],
    ['phone', a.phone],
    ['area', a.area || (detail.length ? null : '—')],
    [a.area ? 'detail' : 'area', detail.join('\n')],
    ['addressName', a.label],
    ['placedAt', fmtPlaced(createdAt)],
  ].filter(([, v]) => v);
  return (
    <div className={className}>
      <p className="eyebrow mb-3">{t('orderDetail.shippingAddress')}</p>
      <dl className="border-t border-line">
        {rows.map(([key, value]) => (
          <div key={key} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-4 border-b border-line py-2.5">
            <dt className="micro pt-0.5 text-muted">{t(`orderDetail.${key}`)}</dt>
            <dd className={`whitespace-pre-line text-sm leading-relaxed text-foreground ${key === 'phone' || key === 'placedAt' ? 'tabular-nums' : ''}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  // From the URL (?placed=1), so the confirmation survives a refresh.
  const justPlaced = params.get('placed') === '1';
  const { t } = useLocale();
  const { error: toastError } = useToast();
  const confirm = useConfirm();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  useDocumentTitle(order ? t('orders.order', { id: order.id }) : t('orders.title'));

  const load = useCallback(() => {
    client
      .get(`/orders/${id}`)
      .then((res) => {
        setOrder(res.data);
        setError(null);
      })
      .catch(() => setError(t('orderDetail.gone')));
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel() {
    const ok = await confirm({
      title: t('orderDetail.confirmCancel'),
      body: t('orderDetail.cancelBody'),
      confirmLabel: t('orderDetail.cancel'),
      cancelLabel: t('orderDetail.keep'),
      tone: 'danger',
    });
    if (!ok) return;
    setCancelling(true);
    try {
      const res = await client.post(`/orders/${id}/cancel`);
      setOrder(res.data);
    } catch (err) {
      toastError(err.response?.data?.error || t('checkout.fail'));
    } finally {
      setCancelling(false);
    }
  }

  if (error) {
    return (
      <EmptyState
        eyebrow={t('orders.title')}
        title={error}
        actions={
          <Button to="/orders">
            <Icon name="arrowLeft" className="h-3.5 w-3.5" />
            {t('orderDetail.back')}
          </Button>
        }
      />
    );
  }
  if (!order) {
    return (
      <>
        <PageHero
          compact
          eyebrow={t('account.eyebrow')}
          title={t('orders.loading')}
          crumbs={[{ label: t('orders.title'), to: '/orders' }]}
        />
        <Section containerClassName="max-w-3xl">
          <div className="divide-y divide-line border-y border-line">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Section>
      </>
    );
  }

  const label = t('orders.order', { id: order.id });
  const crumbs = [{ label: t('orders.title'), to: '/orders' }, { label }];
  const eyebrow = justPlaced ? t('checkout.confirmedEyebrow') : t('account.eyebrow');

  const pieceCount = order.items.reduce((n, it) => n + it.quantity, 0);
  const itemsTitle = (
    <p className="eyebrow mb-3">
      {t('checkout.yourOrder')} · {t('checkout.itemCount', { n: pieceCount })}
    </p>
  );
  const items = (
    <div className="divide-y divide-line border-y border-line">
      {order.items.map((it) => (
        <LineItem
          key={it.id}
          name={it.name || `#${it.product_id}`}
          image={it.image_url}
          variantLabel={it.variant_label}
          quantity={it.quantity}
          price={it.price}
          originalPrice={it.original_price}
        />
      ))}
    </div>
  );
  const subtotal = order.items.reduce((n, it) => n + it.original_price * it.quantity, 0);
  const header = (
    <>
      <Breadcrumb items={crumbs} className="mb-6" />
      <p className="eyebrow">{eyebrow}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <h1 className="heading-serif text-3xl leading-[1.05] md:text-4xl">{label}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
    </>
  );

  /* Every status fits one screen on a tablet or computer, using the page's
     full width; a phone stacks and scrolls.

     Awaiting payment: the order on the left, the way to pay it on the right
     (payment first on a phone). */
  if (order.status === 'pending') {
    return (
      <section className="container-lux py-8 md:py-10">
        {header}

        <div className="mt-8 grid gap-10 md:grid-cols-2 md:items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
          <div className="order-first min-w-0 md:order-last">
            <QPayPanel orderId={order.id} onPaid={load} />
          </div>

          <div className="min-w-0">
            {/* A long order scrolls inside its own list, so the column never
                pushes the page past the screen. */}
            {itemsTitle}
            <div className="md:max-h-[34svh] md:overflow-y-auto">{items}</div>
            <OrderSummary className="mt-6" subtotal={subtotal} total={order.total} />

            <DeliveryDetails className="mt-8" address={order.shipping_address} createdAt={order.created_at} />

            <div className="mt-6">
              <TextButton onClick={cancel} disabled={cancelling}>
                {cancelling ? t('orderDetail.cancelling') : t('orderDetail.cancel')}
              </TextButton>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* Paid and onwards: where the order stands across the top, then what was
     ordered beside where it is going. A long order scrolls inside its own
     list, so the page never runs past the screen. */
  return (
    <section className="container-lux py-8 md:py-10">
      {header}

      <div className="mt-6">
        <OrderTimeline status={order.status} history={order.status_history} createdAt={order.created_at} />
      </div>

      <div className="mt-6 grid gap-10 md:grid-cols-2 md:items-start lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
        {/* The same order line as the bag and checkout — photo, name, size,
            quantity and price — instead of a four-column table that would not
            fit a phone. */}
        <div className="min-w-0">
          {itemsTitle}
          <div className="md:max-h-[26svh] md:overflow-y-auto">{items}</div>
          <OrderSummary className="mt-6" subtotal={subtotal} total={order.total} />
        </div>

        <DeliveryDetails className="min-w-0" address={order.shipping_address} createdAt={order.created_at} />
      </div>
    </section>
  );
}
