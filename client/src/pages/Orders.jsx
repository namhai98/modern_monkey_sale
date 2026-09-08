import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { useLocale } from '../context/LocaleContext';
import { useMoney } from '../lib/price';
import Skeleton from '../components/Skeleton';

export default function Orders() {
  const { t } = useLocale();
  const money = useMoney();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get('/orders/mine')
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <p className="eyebrow text-stone">{t('account.eyebrow')}</p>
      <h1 className="font-display text-4xl mt-3 mb-12">{t('orders.title')}</h1>

      {loading && (
        <div className="divide-y divide-line border-y border-line">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-6">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      )}

      {!loading && orders.length === 0 && (
        <p className="text-stone">
          {t('orders.none')} <Link to="/shop" className="link-underline text-ink">{t('orders.start')}</Link>.
        </p>
      )}

      <div className="divide-y divide-line border-y border-line">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className="flex justify-between items-center py-6 group"
          >
            <div>
              <p className="font-display text-xl group-hover:italic">{t('orders.order', { id: order.id })}</p>
              <p className="text-sm text-stone mt-1">
                {new Date(order.created_at).toLocaleDateString()}
                {order.item_count != null && ` · ${t('orders.items', { n: order.item_count })}`}
              </p>
            </div>
            <div className="text-right space-y-2">
              <p className="text-stone">{money(order.total)}</p>
              <OrderStatusBadge status={order.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
