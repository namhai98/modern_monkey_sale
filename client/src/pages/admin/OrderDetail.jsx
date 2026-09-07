import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client from '../../api/client';
import AdminNav from '../../components/AdminNav';
import OrderStatusBadge from '../../components/OrderStatusBadge';

const RESTOCKING = new Set(['cancelled', 'refunded']);

function TransitionPanel({ orderId, target, onDone, onCancel }) {
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
      setError(err.response?.data?.error || 'Could not update status');
      setBusy(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 mt-3 bg-gray-50 text-sm space-y-2">
      <p>
        Move to <span className="font-medium capitalize">{target}</span>
      </p>
      <textarea
        className="w-full border border-gray-300 rounded-md px-3 py-2"
        rows={2}
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {restocks && (
        <label className="flex items-center gap-2 text-gray-600">
          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
          Return items to stock
        </label>
      )}
      {error && <p className="text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={apply}
          disabled={busy}
          className="bg-gray-900 text-white px-4 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {busy ? 'Applying...' : 'Confirm'}
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 text-gray-600 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [target, setTarget] = useState(null);

  const load = useCallback(() => {
    client
      .get(`/orders/${id}`)
      .then((res) => { setOrder(res.data); setError(null); })
      .catch((err) => setError(err.response?.data?.error || 'Could not load this order'));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <AdminNav />
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <AdminNav />
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <AdminNav />
      <Link to="/admin/orders" className="text-sm text-gray-500 hover:underline">&larr; All orders</Link>

      <div className="flex items-center justify-between mt-2 mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Order #{order.id}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
        <div>
          <p className="font-medium text-gray-800">Customer</p>
          {order.user ? (
            <>
              <p>{order.user.name}</p>
              <p className="text-gray-400">{order.user.email}</p>
            </>
          ) : (
            <p>—</p>
          )}
        </div>
        <div>
          <p className="font-medium text-gray-800">Shipping address</p>
          <p className="whitespace-pre-line">{order.shipping_address || '—'}</p>
        </div>
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

      <div className="mb-8">
        <p className="text-sm font-medium text-gray-800 mb-2">Change status</p>
        {order.allowed_transitions?.length ? (
          <div className="flex flex-wrap gap-2">
            {order.allowed_transitions.map((t) => (
              <button
                key={t}
                onClick={() => setTarget(target === t ? null : t)}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  target === t
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No further transitions from “{order.status}”.</p>
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
        <h2 className="text-sm font-medium text-gray-800 mb-2">History</h2>
        <ol className="space-y-1 text-sm text-gray-500">
          {order.status_history.map((h) => (
            <li key={h.id}>
              <span className="text-gray-400">{new Date(h.created_at).toLocaleString()}</span>
              {' — '}
              {h.from_status ? `${h.from_status} → ` : ''}
              <span className="text-gray-700">{h.to_status}</span>
              {h.user?.name && <span className="text-gray-400"> by {h.user.name}</span>}
              {h.note && <span className="text-gray-400"> ({h.note})</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
