import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import OrderStatusBadge from '../components/OrderStatusBadge';
import OrderTimeline from '../components/OrderTimeline';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
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
  const placed = t('orderDetail.placed', { date: new Date(order.created_at).toLocaleString() });

  /* Awaiting payment: one screen on a tablet or computer — the order on the
     left, the way to pay it on the right, using the page's full width. On a
     phone they stack, payment first. Once paid, the page returns to its usual
     single column with the timeline. */
  if (order.status === 'pending') {
    return (
      <section className="container-lux py-8 md:py-10">
        <Breadcrumb items={crumbs} className="mb-6" />
        <p className="eyebrow">{eyebrow}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          <h1 className="heading-serif text-3xl leading-[1.05] md:text-4xl">{label}</h1>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="mt-8 grid gap-10 md:grid-cols-2 md:items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
          <div className="order-first min-w-0 md:order-last">
            <QPayPanel orderId={order.id} onPaid={load} />
          </div>

          <div className="min-w-0">
            {/* A long order scrolls inside its own list, so the column never
                pushes the page past the screen. */}
            <div className="md:max-h-[34svh] md:overflow-y-auto">{items}</div>
            <OrderSummary className="mt-6" subtotal={subtotal} total={order.total} />

            <div className="mt-8 grid gap-6 border-t border-line pt-6 lg:grid-cols-2">
              <div>
                <p className="eyebrow mb-3">{t('orderDetail.shippingAddress')}</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                  {order.shipping_address || '—'}
                </p>
              </div>
              <p className="micro tracking-meta text-muted lg:self-end lg:text-right">{placed}</p>
            </div>

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

  return (
    <>
      <PageHero compact eyebrow={eyebrow} title={label} crumbs={crumbs}>
        <div className="mt-4">
          <OrderStatusBadge status={order.status} />
        </div>
      </PageHero>

      <Section containerClassName="max-w-3xl">
        <OrderTimeline status={order.status} history={order.status_history} createdAt={order.created_at} />

        {/* The same order line as the bag and checkout — photo, name, size,
            quantity and price — instead of a four-column table that would not
            fit a phone. */}
        <div className="mt-14">{items}</div>
        <OrderSummary className="mt-8" subtotal={subtotal} total={order.total} />

        <div className="mt-14">
          <p className="eyebrow mb-4">{t('orderDetail.shippingAddress')}</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
            {order.shipping_address || '—'}
          </p>
          <p className="micro mt-5 tracking-meta text-muted">{placed}</p>
        </div>
      </Section>
    </>
  );
}
