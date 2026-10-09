import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { useLocale } from '../context/LocaleContext';
import { useMoney } from '../lib/price';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Skeleton from '../components/Skeleton';
import PageHero from '../components/PageHero';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Section from '../components/Section';

export default function Orders() {
  const { t } = useLocale();
  useDocumentTitle(t('orders.title'));
  const money = useMoney();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  // A failed load is not "no orders" — it gets its own message and a retry.
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    client
      .get('/orders/mine')
      .then((res) => setOrders(res.data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [attempt]);

  return (
    <>
      <PageHero
        compact
        eyebrow={t('account.eyebrow')}
        title={t('orders.title')}
        crumbs={[{ label: t('orders.title') }]}
      />

      <Section containerClassName="max-w-3xl">
        {loading && (
          <div className="divide-y divide-line border-y border-line">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-7">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        )}

        {!loading && failed && (
          <EmptyState
            inline
            title={t('common.loadFailed')}
            actions={<Button onClick={() => setAttempt((n) => n + 1)}>{t('common.retry')}</Button>}
          />
        )}

        {!loading && !failed && orders.length === 0 && (
          <EmptyState
            inline
            title={t('orders.none')}
            actions={<Button to="/shop?all=1">{t('orders.start')}</Button>}
          />
        )}

        {!loading && orders.length > 0 && (
          <div className="divide-y divide-line border-y border-line">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="group flex items-center justify-between gap-5 py-7"
              >
                <div className="min-w-0">
                  <p className="heading-serif text-xl transition-colors duration-300 group-hover:text-gold">
                    {t('orders.order', { id: order.id })}
                  </p>
                  <p className="micro mt-2 tracking-meta text-muted">
                    {new Date(order.created_at).toLocaleDateString()}
                    {order.item_count != null && ` · ${t('orders.items', { n: order.item_count })}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2.5">
                  <p className="text-sm tabular-nums text-foreground">{money(order.total)}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
