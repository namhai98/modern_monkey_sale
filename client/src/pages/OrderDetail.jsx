import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import OrderStatusBadge from '../components/OrderStatusBadge';
import OrderTimeline from '../components/OrderTimeline';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import PageHero from '../components/PageHero';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
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
    if (!confirm(t('orderDetail.confirmCancel'))) return;
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
        actions={<Button to="/orders">{t('orderDetail.back')}</Button>}
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

  return (
    <>
      <PageHero
        compact
        eyebrow={justPlaced ? t('checkout.confirmedEyebrow') : t('account.eyebrow')}
        title={label}
        crumbs={[{ label: t('orders.title'), to: '/orders' }, { label }]}
      >
        {justPlaced && (
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
            {t('checkout.confirmedNote')}
          </p>
        )}
        <div className="mt-6">
          <OrderStatusBadge status={order.status} />
        </div>
      </PageHero>

      <Section containerClassName="max-w-3xl">
        {/* Right after checkout: what happens now, in three plain steps — the
            shopper's next question once the order is in. */}
        {justPlaced && (
          <div className="mb-14 border border-gold/40 bg-surface p-6 md:p-8">
            <p className="eyebrow">{t('orderDetail.nextTitle')}</p>
            <ol className="mt-5 space-y-4">
              {[1, 2, 3].map((n) => (
                <li key={n} className="flex gap-4 text-sm leading-relaxed">
                  <span className="heading-serif text-gold">{String(n).padStart(2, '0')}</span>
                  <span className="text-muted">{t(`orderDetail.next${n}`)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <OrderTimeline status={order.status} history={order.status_history} createdAt={order.created_at} />

        {/* The same order line as the bag and checkout — photo, name, size,
            quantity and price — instead of a four-column table that would not
            fit a phone. */}
        <div className="mt-14 divide-y divide-line border-y border-line">
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
        <OrderSummary
          className="mt-8"
          subtotal={order.items.reduce((n, it) => n + it.original_price * it.quantity, 0)}
          total={order.total}
        />

        <div className="mt-14">
          <p className="eyebrow mb-4">{t('orderDetail.shippingAddress')}</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
            {order.shipping_address || '—'}
          </p>
          <p className="micro mt-5 tracking-meta text-muted">
            {t('orderDetail.placed', { date: new Date(order.created_at).toLocaleString() })}
          </p>
        </div>

        {order.status === 'pending' && (
          <div className="mt-14 border-t border-line pt-8">
            <TextButton onClick={cancel} disabled={cancelling}>
              {cancelling ? t('orderDetail.cancelling') : t('orderDetail.cancel')}
            </TextButton>
          </div>
        )}
      </Section>
    </>
  );
}
