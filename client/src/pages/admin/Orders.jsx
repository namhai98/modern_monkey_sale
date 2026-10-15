import { useCallback, useEffect, useState } from 'react';
import Button from '../../components/Button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import Pager from '../../components/Pager';
import Skeleton from '../../components/Skeleton';
import { useLocale } from '../../context/LocaleContext';
import { useToast } from '../../context/ToastContext';
import { parseShippingAddress } from '../../lib/orderAddress';
import { LoadError, AdminPage, DateFilter, SearchInput, Toolbar, usd, useDebounced, useFillHeight } from './kit';
import { thCls, thNumCls, trCls } from './ui';

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
const LIMIT = 20;
// Rows a little tighter than the admin default, so a page of orders scans in
// one look; heads stick to the top of the scrolling list.
const TH = 'sticky top-0 z-10 bg-admin-thead';
const TD = 'px-4 py-2.5 align-middle';
const TD_NUM = 'px-4 py-2.5 text-right align-middle tabular-nums';

const fmtDateTime = (d) =>
  new Date(d).toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

/* Status as tabs with their counts, in place of a dropdown: what needs doing
   (pending, paid) is visible before anything is clicked. */
function StatusTabs({ value, onChange, counts }) {
  const { t } = useLocale();
  const all = Object.values(counts || {}).reduce((n, x) => n + x, 0);
  const tabs = [{ value: '', label: t('admin.orders.tabAll'), n: all }, ...STATUSES.map((s) => ({ value: s, label: t(`status.${s}`), n: counts?.[s] || 0 }))];
  return (
    <div
      role="tablist"
      aria-label={t('admin.orders.statusTabs')}
      className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const on = tab.value === value;
        return (
          <button
            key={tab.value || 'all'}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.value)}
            className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              on ? 'border-gold text-gold' : 'border-transparent text-muted hover:border-admin-field-border hover:text-foreground'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                on
                  ? 'bg-gold-fill/15 text-gold'
                  : tab.n && (tab.value === 'pending' || tab.value === 'paid')
                    ? 'bg-admin-hover text-foreground'
                    : 'bg-admin-hover text-muted'
              }`}
            >
              {tab.n}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function AdminOrders() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { error: toastError } = useToast();
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState({ items: [], total: 0, status_counts: {} });
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
  const filtered = Boolean(search || from || to);
  const clear = () => { setSearch(''); setFrom(''); setTo(''); };
  // The list ends at the window's bottom edge and scrolls inside itself.
  const listRef = useFillHeight(16, [loading, data.items.length, totalPages]);

  return (
    <AdminPage
      dense
      title={t('admin.orders.title')}
      count={t('admin.orders.count', { n: data.total })}
      actions={
        <Button variant="outline-dark" size="xs" type="button" onClick={exportCsv} disabled={exporting || data.total === 0}>
          <Icon name="arrowUp" className="h-3.5 w-3.5 rotate-180" />
          {exporting ? t('admin.orders.exporting') : t('admin.orders.export')}
        </Button>
      }
    >
      <Toolbar dense active={filtered} onClear={clear}>
        <SearchInput value={search} onChange={setSearch} placeholder={t('admin.orders.searchPlaceholder')} className="w-full sm:w-80" />
        <DateFilter label={t('admin.orders.from')} value={from} onChange={setFrom} />
        <DateFilter label={t('admin.orders.to')} value={to} onChange={setTo} />
      </Toolbar>

      <StatusTabs value={status} onChange={setStatus} counts={data.status_counts} />

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      )}
      {error && <LoadError message={error} onRetry={load} />}

      {!loading && !error && data.items.length === 0 && (
        <EmptyState inline title={t('admin.orders.none')} />
      )}

      {!loading && !error && data.items.length > 0 && (
        <>
          <div ref={listRef} className="admin-card overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className={trCls}>
                  <th className={`${thCls} ${TH}`}>{t('admin.orders.colOrder')}</th>
                  <th className={`${thCls} ${TH}`}>{t('admin.orders.colCustomer')}</th>
                  <th className={`${thCls} ${TH}`}>{t('admin.orders.colDelivery')}</th>
                  <th className={`${thNumCls} ${TH}`}>{t('admin.orders.colItems')}</th>
                  <th className={`${thNumCls} ${TH}`}>{t('admin.orders.colTotal')}</th>
                  <th className={`${thNumCls} ${TH}`}>{t('admin.orders.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => {
                  const addr = parseShippingAddress(o.shipping_address);
                  return (
                    /* The whole row opens the order; the number stays a real
                       link for keyboard users and middle-click. */
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                      className={`${trCls} group cursor-pointer transition-colors hover:bg-admin-hover`}
                    >
                      <td className={`${TD} whitespace-nowrap`}>
                        <a
                          href={`/admin/orders/${o.id}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/admin/orders/${o.id}`); }}
                          className="font-medium text-foreground transition-colors group-hover:text-gold"
                        >
                          #{o.id}
                        </a>
                        <div className="text-xs text-muted">{fmtDateTime(o.created_at)}</div>
                      </td>
                      <td className={TD}>
                        <div className="max-w-[14rem] truncate text-foreground">{addr.name || o.user?.name || '—'}</div>
                        <div className="max-w-[14rem] truncate text-xs text-muted">{addr.phone || o.user?.email || ''}</div>
                      </td>
                      <td className={`${TD} max-w-[18rem]`}>
                        <div className="truncate text-muted" title={o.shipping_address || ''}>
                          {addr.area || addr.lines[0] || '—'}
                        </div>
                      </td>
                      <td className={`${TD_NUM} text-muted`}>{o.item_count ?? '—'}</td>
                      <td className={`${TD_NUM} text-foreground`}>{usd(o.total)}</td>
                      <td className={TD_NUM}><OrderStatusBadge status={o.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pager
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              prevLabel={t('admin.orders.prev')}
              nextLabel={t('admin.orders.next')}
              className="mt-3"
            />
          )}
        </>
      )}
    </AdminPage>
  );
}
