import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import Pager from '../../components/Pager';
import Skeleton from '../../components/Skeleton';
import { useLocale } from '../../context/LocaleContext';
import { useToast } from '../../context/ToastContext';
import { AdminPage, DateFilter, SearchInput, SelectFilter, TableWrap, Toolbar, usd, useDebounced } from './kit';
import { btnGhost, thCls, thNumCls, tdCls, tdNumCls, trCls } from './ui';

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
const LIMIT = 20;

const fmtDateTime = (d) =>
  new Date(d).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AdminOrders() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { error: toastError } = useToast();
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  // The dashboard's status counts link here as ?status=…
  const [status, setStatus] = useState(() => (STATUSES.includes(params.get('status')) ? params.get('status') : ''));
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const q = useDebounced(search.trim());

  useEffect(() => { setPage(1); }, [status, q, from, to]);

  const filterParams = useCallback(
    () => ({
      ...(status ? { status } : {}),
      ...(q ? { search: q } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [status, q, from, to]
  );

  const load = useCallback(() => {
    setLoading(true);
    client
      .get('/orders', { params: { ...filterParams(), page, limit: LIMIT } })
      .then((res) => { setData(res.data); setError(null); })
      .catch((err) => setError(err.response?.data?.error || t('admin.orders.loadFailed')))
      .finally(() => setLoading(false));
  }, [filterParams, page, t]);

  // The same filters as the table, as a CSV file for the books. Fetched as a
  // blob (the request carries the auth header) and handed to the browser.
  async function exportCsv() {
    setExporting(true);
    try {
      const res = await client.get('/orders/export', { params: filterParams(), responseType: 'blob' });
      const name = /filename="([^"]+)"/.exec(res.headers['content-disposition'] || '')?.[1] || 'orders.csv';
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toastError(t('admin.orders.exportFailed'));
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / LIMIT));
  const filtered = Boolean(status || search || from || to);
  const clear = () => { setStatus(''); setSearch(''); setFrom(''); setTo(''); };

  return (
    <AdminPage
      title={t('admin.orders.title')}
      count={t('admin.orders.count', { n: data.total })}
      actions={
        <button type="button" onClick={exportCsv} disabled={exporting || data.total === 0} className={`${btnGhost} gap-2`}>
          <Icon name="arrowUp" className="h-3.5 w-3.5 rotate-180" />
          {exporting ? t('admin.orders.exporting') : t('admin.orders.export')}
        </button>
      }
    >
      <Toolbar active={filtered} onClear={clear}>
        <SearchInput value={search} onChange={setSearch} placeholder={t('admin.orders.searchPlaceholder')} />
        <SelectFilter label={t('admin.orders.colStatus')} value={status} onChange={setStatus}>
          <option value="">{t('admin.orders.allStatuses')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </SelectFilter>
        <DateFilter label={t('admin.orders.from')} value={from} onChange={setFrom} />
        <DateFilter label={t('admin.orders.to')} value={to} onChange={setTo} />
      </Toolbar>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && data.items.length === 0 && (
        <EmptyState inline title={t('admin.orders.none')} />
      )}

      {!loading && !error && data.items.length > 0 && (
        <>
          <TableWrap>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className={trCls}>
                  <th className={thCls}>{t('admin.orders.colOrder')}</th>
                  <th className={thCls}>{t('admin.orders.colCustomer')}</th>
                  <th className={thCls}>{t('admin.orders.colDate')}</th>
                  <th className={thNumCls}>{t('admin.orders.colItems')}</th>
                  <th className={thNumCls}>{t('admin.orders.colTotal')}</th>
                  <th className={thNumCls}>{t('admin.orders.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  /* The whole row opens the order; the number stays a real
                     link for keyboard users and middle-click. */
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/admin/orders/${o.id}`)}
                    className={`${trCls} group cursor-pointer transition-colors hover:bg-surface`}
                  >
                    <td className={tdCls}>
                      <a
                        href={`/admin/orders/${o.id}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/admin/orders/${o.id}`); }}
                        className="font-medium text-foreground transition-colors group-hover:text-gold"
                      >
                        #{o.id}
                      </a>
                    </td>
                    <td className={tdCls}>
                      <div className="text-foreground">{o.user?.name || '—'}</div>
                      {o.user?.email && <div className="text-xs text-muted">{o.user.email}</div>}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-muted`}>{fmtDateTime(o.created_at)}</td>
                    <td className={`${tdNumCls} text-muted`}>{o.item_count ?? '—'}</td>
                    <td className={`${tdNumCls} text-foreground`}>{usd(o.total)}</td>
                    <td className={tdNumCls}><OrderStatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          <Pager
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            prevLabel={t('admin.orders.prev')}
            nextLabel={t('admin.orders.next')}
            className="mt-8"
          />
        </>
      )}
    </AdminPage>
  );
}
