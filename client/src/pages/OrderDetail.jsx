import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import client from '../api/client';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { useMoney } from '../lib/price';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import PageHero from '../components/PageHero';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Section from '../components/Section';
import Skeleton from '../components/Skeleton';
import TextButton from '../components/TextButton';

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const justPlaced = Boolean(location.state?.justPlaced);
  const { t } = useLocale();
  const { error: toastError } = useToast();
  const money = useMoney();
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
        {/* The presentation site has no tables at all, so this one is built from
            the same parts as everything else: micro-type column heads over a
            hairline, hairline row rules, and no fills or zebra striping. */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="micro pb-4 font-normal text-muted">{t('orderDetail.item')}</th>
              <th className="micro pb-4 text-right font-normal text-muted">{t('orderDetail.qty')}</th>
              <th className="micro pb-4 text-right font-normal text-muted">{t('orderDetail.price')}</th>
              <th className="micro pb-4 text-right font-normal text-muted">{t('orderDetail.total')}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id} className="border-b border-line">
                <td className="py-4 pr-4">
                  <span className="heading-serif text-base">{it.name || `#${it.product_id}`}</span>
                  {(it.variant_label || it.sku) && (
                    <span className="micro mt-1 block tracking-meta text-muted">
                      {[it.variant_label, it.sku].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </td>
                <td className="py-4 text-right tabular-nums">{it.quantity}</td>
                <td className="py-4 text-right tabular-nums">
                  {it.discount_amount > 0 ? (
                    <span className="inline-flex flex-col items-end leading-tight">
                      <s className="text-xs text-muted/60">{money(it.original_price)}</s>
                      <span>{money(it.price)}</span>
                    </span>
                  ) : (
                    money(it.price)
                  )}
                </td>
                <td className="py-4 text-right tabular-nums">{money(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-6 text-right">
                <span className="micro text-muted">{t('orderDetail.total')}</span>
              </td>
              <td className="pt-6 text-right">
                <span className="heading-serif text-xl tabular-nums">{money(order.total)}</span>
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-14 grid gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-4">{t('orderDetail.shippingAddress')}</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
              {order.shipping_address || '—'}
            </p>
            <p className="micro mt-5 tracking-meta text-muted">
              {t('orderDetail.placed', { date: new Date(order.created_at).toLocaleString() })}
            </p>
          </div>

          {order.status_history?.length > 0 && (
            <div>
              <p className="eyebrow mb-4">{t('orderDetail.history')}</p>
              <ol className="space-y-3 text-sm">
                {order.status_history.map((h) => (
                  <li key={h.id} className="border-b border-line pb-3">
                    <span className="micro block tracking-meta text-muted">
                      {new Date(h.created_at).toLocaleString()}
                    </span>
                    <span className="mt-1 block">
                      {h.from_status ? `${t(`status.${h.from_status}`)} → ` : ''}
                      <span className="text-gold">{t(`status.${h.to_status}`)}</span>
                    </span>
                    {h.note && <span className="mt-1 block text-xs text-muted">{h.note}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
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
