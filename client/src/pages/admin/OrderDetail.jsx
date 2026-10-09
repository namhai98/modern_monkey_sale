import { useCallback, useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import ImageFallback from '../../components/ImageFallback';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import Skeleton from '../../components/Skeleton';
import { useLocale } from '../../context/LocaleContext';
import { AdminPage, TextField, ToggleChip, usd } from './kit';
import { btnPrimary, btnGhost } from './ui';

const RESTOCKING = new Set(['cancelled', 'refunded']);
const fmtDateTime = (d) =>
  new Date(d).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// A titled block in the side column — same micro-label + hairline language as
// the forms.
function Panel({ title, children }) {
  return (
    <section className="border border-line bg-surface p-6">
      <h2 className="micro tracking-button text-gold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TransitionPanel({ orderId, target, onDone, onCancel }) {
  const { t } = useLocale();
  const [note, setNote] = useState('');
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const restocks = RESTOCKING.has(target);
  const danger = RESTOCKING.has(target);

  async function apply(e) {
    e.preventDefault();
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
    <form onSubmit={apply} className={`mt-5 space-y-5 border-l-2 pl-4 ${danger ? 'border-danger' : 'border-gold'}`}>
      <p className="text-sm text-foreground">
        {t('admin.orderDetail.moveTo', { target: t(`status.${target}`) })}
      </p>
      <TextField
        as="textarea"
        rows={2}
        label={t('admin.orderDetail.noteLabel')}
        hint={t('admin.orderDetail.noteHint')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="[&_textarea]:resize-y"
      />
      {restocks && (
        <ToggleChip checked={restock} onChange={setRestock}>{t('admin.orderDetail.returnStock')}</ToggleChip>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? t('admin.orderDetail.applying') : t('admin.orderDetail.confirm')}
        </button>
        <button type="button" onClick={onCancel} className={btnGhost}>
          {t('admin.orderDetail.cancel')}
        </button>
      </div>
    </form>
  );
}

function StatusActions({ order, onChange }) {
  const { t } = useLocale();
  const [target, setTarget] = useState(null);
  const groupId = useId();

  if (!order.allowed_transitions?.length) {
    return <p className="text-sm text-muted">{t('admin.orderDetail.noTransitions', { status: t(`status.${order.status}`) })}</p>;
  }
  return (
    <>
      <p id={groupId} className="micro mb-3 text-muted">{t('admin.orderDetail.changeStatus')}</p>
      <div role="group" aria-labelledby={groupId} className="flex flex-wrap gap-2">
        {order.allowed_transitions.map((s) => {
          const on = target === s;
          const danger = RESTOCKING.has(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => setTarget(on ? null : s)}
              className={`micro border px-3.5 py-2 tracking-meta transition-colors duration-300 ${
                on
                  ? danger ? 'border-danger text-danger' : 'border-gold text-gold'
                  : danger
                    ? 'border-line text-muted hover:border-danger hover:text-danger'
                    : 'border-line text-muted hover:border-gold hover:text-foreground'
              }`}
            >
              {t(`status.${s}`)}
            </button>
          );
        })}
      </div>
      {target && (
        <TransitionPanel
          key={target}
          orderId={order.id}
          target={target}
          onDone={(fresh) => { onChange(fresh); setTarget(null); }}
          onCancel={() => setTarget(null)}
        />
      )}
    </>
  );
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const { t } = useLocale();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    client
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err.response?.data?.error || t('admin.orderDetail.loadFailed')));
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  const back = (
    <Link to="/admin/orders" className="link-lux micro mb-6 inline-block text-muted hover:text-gold">
      {t('admin.orderDetail.back')}
    </Link>
  );

  if (error) {
    return (
      <AdminPage title={t('admin.orderDetail.title', { id })} back={back}>
        <EmptyState
          inline
          title={error}
          actions={<button type="button" onClick={load} className={btnGhost}>{t('admin.ui.retry')}</button>}
        />
      </AdminPage>
    );
  }
  if (!order) {
    return (
      <AdminPage title={t('admin.orderDetail.title', { id })} back={back}>
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      </AdminPage>
    );
  }

  const itemCount = order.items.reduce((n, it) => n + it.quantity, 0);
  const subtotal = order.items.reduce((n, it) => n + Number(it.original_price ?? it.price) * it.quantity, 0);
  const savings = subtotal - Number(order.total);

  return (
    <AdminPage
      title={t('admin.orderDetail.title', { id: order.id })}
      count={`${fmtDateTime(order.created_at)} · ${t('admin.orderDetail.itemCount', { n: itemCount })}`}
      back={back}
      actions={<OrderStatusBadge status={order.status} />}
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* Items + totals */}
        <div>
          <h2 className="micro mb-2 tracking-button text-gold">{t('admin.orderDetail.items')}</h2>
          <ul className="divide-y divide-line border-y border-line">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center gap-4 py-4">
                <div className="h-20 w-16 shrink-0 overflow-hidden border border-line bg-surface">
                  {it.image_url ? (
                    <ImageFallback src={it.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted">
                      <Icon name="tag" className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    {it.product_id ? (
                      <Link to={`/products/${it.product_id}`} className="transition-colors hover:text-gold">
                        {it.name || `#${it.product_id}`}
                      </Link>
                    ) : (it.name || '—')}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {[it.variant_label, it.sku].filter(Boolean).join(' · ')}
                  </p>
                  {it.discount_amount > 0 && it.discount_name && (
                    <p className="micro mt-1.5 text-[10px] text-gold">{it.discount_name}</p>
                  )}
                </div>
                <div className="shrink-0 text-right text-sm tabular-nums">
                  <p className="text-muted">
                    {it.quantity} ×{' '}
                    {it.discount_amount > 0 && <s className="mr-1 text-xs text-muted/70">{usd(it.original_price)}</s>}
                    {usd(it.price)}
                  </p>
                  <p className="mt-1 text-foreground">{usd(it.line_total)}</p>
                </div>
              </li>
            ))}
          </ul>

          <dl className="ml-auto mt-6 max-w-xs space-y-2 text-sm tabular-nums">
            {savings > 0.005 && (
              <>
                <div className="flex justify-between text-muted">
                  <dt>{t('admin.orderDetail.subtotal')}</dt>
                  <dd>{usd(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-gold">
                  <dt>{t('admin.orderDetail.discount')}</dt>
                  <dd>−{usd(savings)}</dd>
                </div>
              </>
            )}
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="micro text-muted">{t('admin.orderDetail.total')}</dt>
              <dd className="heading-serif text-2xl text-foreground">{usd(order.total)}</dd>
            </div>
          </dl>
        </div>

        {/* Side column: status, customer, delivery, history */}
        <div className="space-y-6 lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
          <Panel title={t('admin.orderDetail.statusTitle')}>
            <StatusActions order={order} onChange={setOrder} />
          </Panel>

          <Panel title={t('admin.orderDetail.customer')}>
            {order.user ? (
              <div className="text-sm">
                <p className="text-foreground">{order.user.name}</p>
                <a href={`mailto:${order.user.email}`} className="mt-0.5 block break-all text-muted transition-colors hover:text-gold">
                  {order.user.email}
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted">—</p>
            )}
            <p className="micro mb-1.5 mt-5 text-muted">{t('admin.orderDetail.shippingAddress')}</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{order.shipping_address || '—'}</p>
          </Panel>

          <Panel title={t('admin.orderDetail.history')}>
            <ol className="relative space-y-5 border-l border-line pl-5">
              {[...order.status_history].reverse().map((h, i) => (
                <li key={h.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[1.5625rem] top-1.5 h-2 w-2 rounded-full ${i === 0 ? 'bg-gold' : 'border border-line bg-background'}`}
                  />
                  <p className="text-sm text-foreground">
                    {h.from_status && <span className="text-muted">{t(`status.${h.from_status}`)} → </span>}
                    {t(`status.${h.to_status}`)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {fmtDateTime(h.created_at)}
                    {h.user?.name && ` · ${t('admin.orderDetail.by', { name: h.user.name })}`}
                  </p>
                  {h.note && <p className="mt-1.5 border-l-2 border-line pl-3 text-xs italic text-muted">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
