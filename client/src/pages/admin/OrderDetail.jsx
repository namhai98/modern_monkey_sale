import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client from '../../api/client';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import { money } from '../../lib/price';
import { useLocale } from '../../context/LocaleContext';

const RESTOCKING = new Set(['cancelled', 'refunded']);
const btnPrimary =
  'bg-ink text-canvas border border-ink px-4 py-1.5 text-sm transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50';

function TransitionPanel({ orderId, target, onDone, onCancel }) {
  const { t } = useLocale();
  const [note, setNote] = useState('');
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const restocks = RESTOCKING.has(target);

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const res = await client.patch(`/orders/${orderId}/status`, {
        status: target,
        note: note || undefined,
        ...(restocks ? { restock } : {}),
      });
      onDone(res.data);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.orderDetail.statusFailed'));
      setBusy(false);
    }
  }

  return (
    <div className="border border-line p-4 mt-3 bg-ivory text-sm space-y-2">
      <p className="text-ink">
        {t('admin.orderDetail.moveTo', { target: t(`status.${target}`) })}
      </p>
      <textarea
        className="w-full border border-line bg-transparent px-3 py-2 text-ink placeholder:text-stone focus:outline-none focus:border-champagne transition-colors"
        rows={2}
        placeholder={t('admin.orderDetail.notePlaceholder')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {restocks && (
        <label className="flex items-center gap-2 text-stone">
          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
          {t('admin.orderDetail.returnStock')}
        </label>
      )}
      {error && <p className="text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={apply} disabled={busy} className={btnPrimary}>
          {busy ? t('admin.orderDetail.applying') : t('admin.orderDetail.confirm')}
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 text-stone hover:text-ink">
          {t('admin.orderDetail.cancel')}
        </button>
      </div>
    </div>
  );
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const { t } = useLocale();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [target, setTarget] = useState(null);

  const load = useCallback(() => {
    client
      .get(`/orders/${id}`)
      .then((res) => { setOrder(res.data); setError(null); })
      .catch((err) => setError(err.response?.data?.error || t('admin.orderDetail.loadFailed')));
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto pb-8">
        <p className="text-stone">{error}</p>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="max-w-3xl mx-auto pb-8">
        <p className="text-stone">{t('admin.orderDetail.loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">
      <Link to="/admin/orders" className="text-sm text-stone hover:text-champagne">{t('admin.orderDetail.back')}</Link>

      <div className="flex items-center justify-between mt-3 mb-6">
        <h1 className="font-display text-2xl text-ink">{t('admin.orderDetail.title', { id: order.id })}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 text-sm text-stone mb-8">
        <div>
          <p className="font-medium text-ink">{t('admin.orderDetail.customer')}</p>
          {order.user ? (
            <>
              <p>{order.user.name}</p>
              <p className="text-stone/70">{order.user.email}</p>
            </>
          ) : (
            <p>—</p>
          )}
        </div>
        <div>
          <p className="font-medium text-ink">{t('admin.orderDetail.shippingAddress')}</p>
          <p className="whitespace-pre-line">{order.shipping_address || '—'}</p>
        </div>
      </div>

      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="text-left eyebrow text-stone border-b border-line">
            <th className="py-3 font-normal">{t('admin.orderDetail.colItem')}</th>
            <th className="py-3 text-right font-normal">{t('admin.orderDetail.colQty')}</th>
            <th className="py-3 text-right font-normal">{t('admin.orderDetail.colPrice')}</th>
            <th className="py-3 text-right font-normal">{t('admin.orderDetail.colTotal')}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className="border-b border-line/60">
              <td className="py-3 text-ink">
                {it.name || `Product #${it.product_id}`}
                {it.variant_label && <span className="text-xs text-stone"> · {it.variant_label}</span>}
                {it.sku && <span className="text-xs text-stone/70"> · {it.sku}</span>}
              </td>
              <td className="py-3 text-right text-stone">{it.quantity}</td>
              <td className="py-3 text-right">
                {it.discount_amount > 0 ? (
                  <span className="inline-flex flex-col items-end leading-tight">
                    <s className="text-xs text-stone/70">{money(it.original_price)}</s>
                    <span className="text-ink">{money(it.price)}</span>
                    {it.discount_name && (
                      <span className="text-[10px] text-stone">{it.discount_name}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-ink">{money(it.price)}</span>
                )}
              </td>
              <td className="py-3 text-right text-ink">{money(it.line_total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-3 text-right font-medium text-ink">{t('admin.orderDetail.total')}</td>
            <td className="py-3 text-right font-medium text-ink">{money(order.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mb-10">
        <p className="text-sm font-medium text-ink mb-3">{t('admin.orderDetail.changeStatus')}</p>
        {order.allowed_transitions?.length ? (
          <div className="flex flex-wrap gap-2">
            {order.allowed_transitions.map((s) => (
              <button
                key={s}
                onClick={() => setTarget(target === s ? null : s)}
                className={`px-3 py-1.5 text-sm border transition-colors ${
                  target === s
                    ? 'border-ink bg-ink text-canvas'
                    : 'border-line text-stone hover:border-champagne hover:text-ink'
                }`}
              >
                {t(`status.${s}`)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone">{t('admin.orderDetail.noTransitions', { status: t(`status.${order.status}`) })}</p>
        )}
        {target && (
          <TransitionPanel
            orderId={order.id}
            target={target}
            onDone={(fresh) => { setOrder(fresh); setTarget(null); }}
            onCancel={() => setTarget(null)}
          />
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-ink mb-3">{t('admin.orderDetail.history')}</h2>
        <ol className="space-y-1.5 text-sm text-stone">
          {order.status_history.map((h) => (
            <li key={h.id}>
              <span className="text-stone/70">{new Date(h.created_at).toLocaleString()}</span>
              {' — '}
              {h.from_status ? `${t(`status.${h.from_status}`)} → ` : ''}
              <span className="text-ink">{t(`status.${h.to_status}`)}</span>
              {h.user?.name && <span className="text-stone/70"> {t('admin.orderDetail.by', { name: h.user.name })}</span>}
              {h.note && <span className="text-stone/70"> ({h.note})</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
