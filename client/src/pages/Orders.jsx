import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import OrderStatusBadge from '../components/OrderStatusBadge';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get('/orders/mine')
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="max-w-3xl mx-auto px-6 py-24 text-stone">Loading…</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <p className="eyebrow text-stone">Account</p>
      <h1 className="font-display text-4xl mt-3 mb-12">Your Orders</h1>

      {orders.length === 0 && (
        <p className="text-stone">
          No orders yet. <Link to="/shop" className="link-underline text-ink">Start shopping</Link>.
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
              <p className="font-display text-xl group-hover:italic">Order #{order.id}</p>
              <p className="text-sm text-stone mt-1">
                {new Date(order.created_at).toLocaleDateString()}
                {order.item_count != null &&
                  ` · ${order.item_count} item${order.item_count === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="text-right space-y-2">
              <p className="text-stone">${Number(order.total).toFixed(2)}</p>
              <OrderStatusBadge status={order.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
