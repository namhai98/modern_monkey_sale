import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client from '../api/client';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { useMoney } from '../lib/price';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function OrderDetail() {
  const { id } = useParams();
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
      .then((res) => { setOrder(res.data); setError(null); })
      .catch(() => setError(t('orderDetail.gone')));
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

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

  if (error) return <p className="max-w-3xl mx-auto px-6 py-24 text-stone">{error}</p>;
  if (!order) return <p className="max-w-3xl mx-auto px-6 py-24 text-stone">{t('orders.loading')}</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <Link to="/orders" className="text-sm text-stone link-underline">{t('orderDetail.back')}</Link>

      <div className="flex items-center justify-between mt-3 mb-8">
        <h1 className="font-display text-3xl">{t('orders.order', { id: order.id })}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="text-left text-stone border-b border-line">
            <th className="py-2">{t('orderDetail.item')}</th>
            <th className="py-2 text-right">{t('orderDetail.qty')}</th>
            <th className="py-2 text-right">{t('orderDetail.price')}</th>
            <th className="py-2 text-right">{t('orderDetail.total')}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className="border-b border-line/60">
              <td className="py-3">
                {it.name || `#${it.product_id}`}
                {it.variant_label && <span className="text-xs text-stone"> · {it.variant_label}</span>}
                {it.sku && <span className="text-xs text-stone/70"> · {it.sku}</span>}
              </td>
              <td className="py-3 text-right">{it.quantity}</td>
              <td className="py-3 text-right">
                {it.discount_amount > 0 ? (
                  <span className="inline-flex flex-col items-end leading-tight">
                    <s className="text-xs text-stone/50">{money(it.original_price)}</s>
                    <span>{money(it.price)}</span>
                  </span>
                ) : (
                  money(it.price)
                )}
              </td>
              <td className="py-3 text-right">{money(it.line_total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-3 text-right font-medium">{t('orderDetail.total')}</td>
            <td className="py-3 text-right font-medium">{money(order.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="text-sm text-stone mb-8">
        <p className="eyebrow text-ink mb-1">{t('orderDetail.shippingAddress')}</p>
        <p className="whitespace-pre-line">{order.shipping_address || '—'}</p>
        <p className="mt-3 text-stone/70">
          {t('orderDetail.placed', { date: new Date(order.created_at).toLocaleString() })}
        </p>
      </div>

      {order.status === 'pending' && (
        <button
          onClick={cancel}
          disabled={cancelling}
          className="text-sm text-red-700 link-underline disabled:opacity-50"
        >
          {cancelling ? t('orderDetail.cancelling') : t('orderDetail.cancel')}
        </button>
      )}

      {order.status_history?.length > 0 && (
        <div className="mt-10">
          <h2 className="eyebrow text-ink mb-3">{t('orderDetail.history')}</h2>
          <ol className="space-y-1.5 text-sm text-stone">
            {order.status_history.map((h) => (
              <li key={h.id}>
                <span className="text-stone/70">{new Date(h.created_at).toLocaleString()}</span>
                {' — '}
                {h.from_status ? `${t(`status.${h.from_status}`)} → ` : ''}
                <span className="text-ink">{t(`status.${h.to_status}`)}</span>
                {h.note && <span className="text-stone/70"> ({h.note})</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
