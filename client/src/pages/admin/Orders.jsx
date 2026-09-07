import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import AdminNav from '../../components/AdminNav';
import OrderStatusBadge from '../../components/OrderStatusBadge';

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
const inputCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm';
const LIMIT = 20;

export default function AdminOrders() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => { setPage(1); }, [status, search, from, to]);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get('/orders', {
        params: {
          ...(status ? { status } : {}),
          ...(search ? { search } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          page,
          limit: LIMIT,
        },
      })
      .then((res) => { setData(res.data); setError(null); })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, [status, search, from, to, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / LIMIT));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <AdminNav />
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Orders</h1>

      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className={inputCls} placeholder="Customer name / email" value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <label className="text-gray-500">From <input type="date" className={inputCls} value={from}
          onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-gray-500">To <input type="date" className={inputCls} value={to}
          onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2">Order</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Date</th>
                <th className="py-2 text-right">Items</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2">
                    <Link to={`/admin/orders/${o.id}`} className="text-gray-900 hover:underline font-medium">
                      #{o.id}
                    </Link>
                  </td>
                  <td className="py-2 text-gray-600">
                    {o.user ? (o.user.name || o.user.email || `User #${o.user.id}`) : '—'}
                  </td>
                  <td className="py-2 text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="py-2 text-right">{o.item_count ?? '—'}</td>
                  <td className="py-2 text-right">${Number(o.total).toFixed(2)}</td>
                  <td className="py-2"><OrderStatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <p className="text-gray-500 mt-4">No orders match.</p>}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6 text-sm">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-40">Previous</button>
              <span className="text-gray-600">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
