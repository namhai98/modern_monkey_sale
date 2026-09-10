import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import Select from '../../components/Select';
import { useLocale } from '../../context/LocaleContext';

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
const inputCls =
  'border border-line bg-transparent px-3 py-2 text-sm text-ink placeholder:text-stone ' +
  'focus:outline-none focus:border-champagne transition-colors';
const LIMIT = 20;

export default function AdminOrders() {
  const { t } = useLocale();
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
      .catch((err) => setError(err.response?.data?.error || t('admin.orders.loadFailed')))
      .finally(() => setLoading(false));
  }, [status, search, from, to, page, t]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / LIMIT));

  return (
    <div className="max-w-5xl mx-auto pb-8">
      <h1 className="font-display text-2xl text-ink mb-6">{t('admin.orders.title')}</h1>

      <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
        <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('admin.orders.allStatuses')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </Select>
        <input className={inputCls} placeholder={t('admin.orders.searchPlaceholder')} value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <label className="text-stone">{t('admin.orders.from')} <input type="date" className={inputCls} value={from}
          onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-stone">{t('admin.orders.to')} <input type="date" className={inputCls} value={to}
          onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      {loading && <p className="text-stone">{t('admin.orders.loading')}</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left eyebrow text-stone border-b border-line">
                <th className="py-3 font-normal">{t('admin.orders.colOrder')}</th>
                <th className="py-3 font-normal">{t('admin.orders.colCustomer')}</th>
                <th className="py-3 font-normal">{t('admin.orders.colDate')}</th>
                <th className="py-3 text-right font-normal">{t('admin.orders.colItems')}</th>
                <th className="py-3 text-right font-normal">{t('admin.orders.colTotal')}</th>
                <th className="py-3 text-right font-normal">{t('admin.orders.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id} className="border-b border-line/60 transition-colors hover:bg-ivory">
                  <td className="py-3">
                    <Link to={`/admin/orders/${o.id}`} className="text-ink font-medium transition-colors hover:text-champagne">
                      #{o.id}
                    </Link>
                  </td>
                  <td className="py-3 text-stone">
                    {o.user ? (o.user.name || o.user.email || `User #${o.user.id}`) : '—'}
                  </td>
                  <td className="py-3 text-stone">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="py-3 text-right text-stone">{o.item_count ?? '—'}</td>
                  <td className="py-3 text-right text-ink">${Number(o.total).toFixed(2)}</td>
                  <td className="py-3 text-right"><OrderStatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <p className="text-stone mt-4">{t('admin.orders.none')}</p>}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 text-sm">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1 border border-line text-ink transition-colors hover:border-champagne disabled:opacity-40 disabled:hover:border-line">{t('admin.orders.prev')}</button>
              <span className="text-stone">{t('admin.orders.pageOf', { page, total: totalPages })}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1 border border-line text-ink transition-colors hover:border-champagne disabled:opacity-40 disabled:hover:border-line">{t('admin.orders.next')}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
