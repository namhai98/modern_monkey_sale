import { useCallback, useEffect, useId, useState } from 'react';
import Button from '../../components/Button';
import { Link, useParams } from 'react-router-dom';
import client from '../../api/client';
import Icon from '../../components/Icon';
import ImageFallback from '../../components/ImageFallback';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import Skeleton from '../../components/Skeleton';
import { useLocale } from '../../context/LocaleContext';
import { parseShippingAddress, telLink } from '../../lib/orderAddress';
import { LoadError, AdminPage, TextField, ToggleChip, usd, useFillHeight } from './kit';

const RESTOCKING = new Set(['cancelled', 'refunded']);
const fmtDateTime = (d) =>
  new Date(d).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// A titled block in the side column — same micro-label + hairline language as
// the forms.
function Panel({ title, children }) {
  return (
    <section className="admin-card p-4 sm:p-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
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
        <Button size="xs" type="submit" disabled={busy}>
          {busy ? t('admin.orderDetail.applying') : t('admin.orderDetail.confirm')}
        </Button>
        <Button variant="outline-dark" size="xs" type="button" onClick={onCancel}>
          {t('admin.orderDetail.cancel')}
        </Button>
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
      <p id={groupId} className="mb-2 text-sm font-medium text-muted">{t('admin.orderDetail.changeStatus')}</p>
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
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                on
                  ? danger ? 'border-danger bg-danger/10 text-danger' : 'border-gold bg-gold-fill/10 text-gold'
                  : danger
                    ? 'border-admin-field-border text-foreground hover:border-danger hover:text-danger'
                    : 'border-admin-field-border text-foreground hover:bg-admin-hover'
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
  // The history ends at the window's bottom edge and scrolls inside itself.
  const historyRef = useFillHeight(8, [order]);

  const load = useCallback(() => {
    setError(null);
    client
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err.response?.data?.error || t('admin.orderDetail.loadFailed')));
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  const back = (
    <Link to="/admin/orders" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground">
      <Icon name="arrowLeft" className="h-3.5 w-3.5" />
      {t('admin.orderDetail.back')}
    </Link>
  );

  if (error) {
    return (
      <AdminPage title={t('admin.orderDetail.title', { id })} back={back}>
        <LoadError message={error} onRetry={load} />
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
  const addr = parseShippingAddress(order.shipping_address);

  /* One screen: the order on the left — its pieces (scrolling inside their own
     list when there are many), the total, then who and where side by side —
     and what to do with it on the right, its history filling the rest of the
     column. */
  return (
    <AdminPage
      dense
      title={t('admin.orderDetail.title', { id: order.id })}
      count={`${fmtDateTime(order.created_at)} · ${t('admin.orderDetail.itemCount', { n: itemCount })}`}
      actions={
        /* The way back sits beside the status rather than on a row of its own,
           which the one-screen layout can't spare. */
        <>
          <Link to="/admin/orders" className="mr-1 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-admin-hover hover:text-foreground">
            <Icon name="arrowLeft" className="h-3.5 w-3.5" />
            {t('admin.orderDetail.back')}
          </Link>
          <OrderStatusBadge status={order.status} />
        </>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0">
          <section className="admin-card p-4 sm:p-5">
          <h2 className="mb-3 text-base font-semibold text-foreground">{t('admin.orderDetail.items')}</h2>
          <ul className="max-h-[30svh] divide-y divide-line overflow-y-auto border-y border-line">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center gap-4 py-2.5">
                <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md border border-line bg-admin-hover">
                  {it.image_url ? (
                    <ImageFallback src={it.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted">
                      <Icon name="tag" className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {it.product_id ? (
                      <Link to={`/products/${it.product_id}`} className="transition-colors hover:text-gold">
                        {it.name || `#${it.product_id}`}
                      </Link>
                    ) : (it.name || '—')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {[it.variant_label, it.sku].filter(Boolean).join(' · ')}
                    {it.discount_amount > 0 && it.discount_name && <span className="ml-2 text-gold">{it.discount_name}</span>}
                  </p>
                </div>
                <div className="shrink-0 text-right text-sm tabular-nums">
                  <p className="text-xs text-muted">
                    {it.quantity} ×{' '}
                    {it.discount_amount > 0 && <s className="mr-1">{usd(it.original_price)}</s>}
                    {usd(it.price)}
                  </p>
                  <p className="mt-0.5 text-foreground">{usd(it.line_total)}</p>
                </div>
              </li>
            ))}
          </ul>

          <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm tabular-nums">
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
            <div className="flex items-baseline justify-between border-t border-line pt-2">
              <dt className="text-sm font-medium text-muted">{t('admin.orderDetail.total')}</dt>
              <dd className="text-2xl font-bold text-foreground">{usd(order.total)}</dd>
            </div>
          </dl>
          </section>

          {/* Who and where, side by side: the phone is what staff reach for,
              so it is a link that dials. */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Panel title={t('admin.orderDetail.customer')}>
              <div className="space-y-1 text-sm">
                <p className="text-foreground">{addr.name || order.user?.name || '—'}</p>
                {addr.phone && (
                  <a href={telLink(addr.phone)} className="inline-flex items-center gap-2 tabular-nums text-foreground transition-colors hover:text-gold">
                    <Icon name="phone" className="h-3.5 w-3.5 text-gold" />
                    {addr.phone}
                  </a>
                )}
                {order.user?.email && (
                  <a href={`mailto:${order.user.email}`} className="block break-all text-muted transition-colors hover:text-gold">
                    {order.user.email}
                  </a>
                )}
              </div>
            </Panel>
            <Panel title={t('admin.orderDetail.shippingAddress')}>
              <div className="space-y-1 text-sm leading-relaxed">
                {addr.lines.length ? (
                  addr.lines.map((l, i) => (
                    <p key={i} className={i === 0 ? 'text-foreground' : 'text-muted'}>{l}</p>
                  ))
                ) : (
                  <p className="text-muted">—</p>
                )}
                {addr.label && (
                  <p className="pt-1 text-xs text-muted">
                    {t('admin.orderDetail.addressName')}: <span className="text-foreground">{addr.label}</span>
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </div>

        {/* Side column: what to do next, then how it got here. */}
        <div className="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <Panel title={t('admin.orderDetail.statusTitle')}>
            <StatusActions order={order} onChange={setOrder} />
          </Panel>

          <Panel title={t('admin.orderDetail.history')}>
            <ol ref={historyRef} className="relative space-y-4 overflow-y-auto border-l border-line pl-5 pr-1">
              {[...order.status_history].reverse().map((h, i) => (
                <li key={h.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[1.5625rem] top-1.5 h-2 w-2 rounded-full ${i === 0 ? 'bg-gold' : 'border border-line bg-background'}`}
                  />
                  <p className="text-sm text-foreground">
                    {h.from_status && (
                      <span className="text-muted">
                        {t(`status.${h.from_status}`)}
                        <Icon name="arrowRight" className="mx-1.5 inline h-3 w-3 align-[-1px]" />
                      </span>
                    )}
                    {t(`status.${h.to_status}`)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {fmtDateTime(h.created_at)}
                    {h.user?.name && ` · ${t('admin.orderDetail.by', { name: h.user.name })}`}
                  </p>
                  {h.note && <p className="mt-1 border-l-2 border-line pl-3 text-xs italic text-muted">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
