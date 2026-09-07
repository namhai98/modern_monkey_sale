import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client from '../api/client';
import OrderStatusBadge from '../components/OrderStatusBadge';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    client
      .get(`/orders/${id}`)
      .then((res) => { setOrder(res.data); setError(null); })
      .catch((err) => setError(err.response?.data?.error || 'Could not load this order'));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function cancel() {
    if (!confirm('Cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await client.post(`/orders/${id}/cancel`);
      setOrder(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not cancel');
    } finally {
      setCancelling(false);
    }
  }

  if (error) return <p className="max-w-3xl mx-auto px-6 py-8 text-gray-500">{error}</p>;
  if (!order) return <p className="max-w-3xl mx-auto px-6 py-8 text-gray-500">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link to="/orders" className="text-sm text-gray-500 hover:underline">&larr; Your orders</Link>

      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Order #{order.id}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-2">Item</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Price</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className="border-b border-gray-100">
              <td className="py-2">
                {it.name || `Product #${it.product_id}`}
                {it.sku && <span className="text-xs text-gray-400"> · {it.sku}</span>}
              </td>
              <td className="py-2 text-right">{it.quantity}</td>
              <td className="py-2 text-right">${it.price.toFixed(2)}</td>
              <td className="py-2 text-right">${it.line_total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-2 text-right font-medium">Total</td>
            <td className="py-2 text-right font-medium">${Number(order.total).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="text-sm text-gray-600 mb-6">
        <p className="font-medium text-gray-800">Shipping address</p>
        <p className="whitespace-pre-line">{order.shipping_address || '—'}</p>
        <p className="mt-2 text-gray-400">Placed {new Date(order.created_at).toLocaleString()}</p>
      </div>

      {order.status === 'pending' && (
        <button
          onClick={cancel}
          disabled={cancelling}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          {cancelling ? 'Cancelling...' : 'Cancel order'}
        </button>
      )}

      {order.status_history?.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-gray-800 mb-2">History</h2>
          <ol className="space-y-1 text-sm text-gray-500">
            {order.status_history.map((h) => (
              <li key={h.id}>
                <span className="text-gray-400">{new Date(h.created_at).toLocaleString()}</span>
                {' — '}
                {h.from_status ? `${h.from_status} → ` : ''}
                <span className="text-gray-700">{h.to_status}</span>
                {h.note && <span className="text-gray-400"> ({h.note})</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
