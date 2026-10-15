import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Icon from '../../components/Icon';
import ImageFallback from '../../components/ImageFallback';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import Skeleton from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { categoryLabel } from '../../lib/i18n';
import { AreaChart, BarList, ChartCard, ChartTable, ColumnChart, StackedBar, fmtCompactUsd } from './charts';
import { LoadError, AdminPage, TableWrap, usd } from './kit';
import { thCls, thNumCls, tdCls, tdNumCls, trCls } from './ui';

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
// "2026-10-15" → "10.15" on an axis, "2026.10.15" in a tooltip or table.
const shortDay = (iso) => iso.slice(5).replace('-', '.');
const longDay = (iso) => iso.replaceAll('-', '.');

const PERIODS = ['today', 'week', 'month'];

const fmtDateTime = (d) =>
  new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// A dashboard card: a title row with an optional "see all" link, then the
// content. A table inside runs edge to edge (TableWrap plain).
function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`admin-card min-w-0 overflow-hidden p-4 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// "See all" in a card's title row.
function SeeAll({ to, children }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-gold transition-colors hover:bg-admin-hover">
      {children}
      <Icon name="arrowRight" className="h-4 w-4" />
    </Link>
  );
}

const PERIOD_ICON = { today: 'clock', week: 'bag', month: 'dashboard' };

function Thumb({ src }) {
  return (
    <span className="block h-11 w-9 shrink-0 overflow-hidden rounded-md border border-line bg-admin-hover">
      {src && <ImageFallback src={src} alt="" className="h-full w-full object-cover" />}
    </span>
  );
}

/* The admin's landing page: what sold, what needs doing, what is running out. */
export default function AdminDashboard() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isManager = ['manager', 'admin'].includes(user?.role);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    client
      .get('/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || t('admin.dashboard.loadFailed')));
  }, [t]);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <AdminPage title={t('admin.dashboard.title')}>
        <LoadError message={error} onRetry={load} />
      </AdminPage>
    );
  }

  if (!data) {
    return (
      <AdminPage title={t('admin.dashboard.title')}>
        <div className="grid gap-4 sm:grid-cols-3">
          {PERIODS.map((p) => <div key={p} className="admin-card p-6"><Skeleton className="h-16 w-full" /></div>)}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminPage>
    );
  }

  const pending = data.status_counts.pending || 0;

  // Chart series.
  const daily = data.daily || [];
  const revenuePoints = daily.map((d) => ({ key: d.day, label: shortDay(d.day), long: longDay(d.day), value: d.revenue }));
  const orderPoints = daily.slice(-14).map((d) => ({ key: d.day, label: shortDay(d.day), long: longDay(d.day), value: d.orders }));
  // Each status keeps its slot whatever the counts: colour follows the
  // status, never its rank.
  const statusSegments = STATUSES.map((s, i) => ({
    key: s,
    label: t(`status.${s}`),
    value: data.status_counts[s] || 0,
    color: `var(--viz-${i + 1})`,
  }));
  const orderTotal = statusSegments.reduce((n, s) => n + s.value, 0);
  const categoryRows = (data.by_category || []).map((r) => ({
    key: r.category?.slug || 'none',
    label: r.category ? categoryLabel(locale, r.category) : t('admin.chart.uncategorized'),
    value: r.revenue,
    sub: t('admin.chart.unitsSold', { n: r.units }),
  }));

  return (
    <AdminPage title={t('admin.dashboard.title')} count={t('admin.dashboard.subtitle')}>
      {/* Sales — Flowbite stat cards. */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PERIODS.map((p) => (
          <div key={p} className="admin-card flex items-start justify-between gap-4 p-4 sm:p-6">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted">{t(`admin.dashboard.${p}`)}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground sm:text-3xl">{usd(data.sales[p].revenue)}</p>
              <p className="mt-1 text-sm text-muted">{t('admin.dashboard.orderCount', { n: data.sales[p].orders })}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-fill/15 text-gold">
              <Icon name={PERIOD_ICON[p] || 'tag'} className="h-5 w-5" />
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{t('admin.dashboard.salesNote')}</p>

      {/* Four charts, four jobs: trend, counts over time, part-to-whole,
          and comparison. Each card can switch to a table. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={t('admin.chart.revenueTitle')}
          subtitle={t('admin.chart.revenueSub')}
          table={
            <ChartTable
              head={[t('admin.chart.date'), t('admin.chart.revenue')]}
              rows={[...revenuePoints].reverse().map((p) => [p.long, usd(p.value)])}
              numeric={[1]}
            />
          }
        >
          <AreaChart points={revenuePoints} format={fmtCompactUsd} valueFormat={usd} label={t('admin.chart.revenueTitle')} />
        </ChartCard>

        <ChartCard
          title={t('admin.chart.ordersTitle')}
          subtitle={t('admin.chart.ordersSub')}
          table={
            <ChartTable
              head={[t('admin.chart.date'), t('admin.chart.orders')]}
              rows={[...orderPoints].reverse().map((p) => [p.long, p.value])}
              numeric={[1]}
            />
          }
        >
          <ColumnChart points={orderPoints} label={t('admin.chart.ordersTitle')} />
        </ChartCard>

        <ChartCard
          title={t('admin.chart.statusTitle')}
          subtitle={t('admin.chart.statusSub', { n: orderTotal })}
          table={
            <ChartTable
              head={[t('admin.chart.status'), t('admin.chart.count'), t('admin.chart.share')]}
              rows={statusSegments.map((s) => [s.label, s.value, `${orderTotal ? Math.round((s.value / orderTotal) * 1000) / 10 : 0}%`])}
              numeric={[1, 2]}
            />
          }
        >
          <StackedBar segments={statusSegments} label={t('admin.chart.statusTitle')} />
        </ChartCard>

        <ChartCard
          title={t('admin.chart.categoryTitle')}
          subtitle={t('admin.chart.categorySub')}
          table={
            categoryRows.length > 0 && (
              <ChartTable
                head={[t('admin.chart.category'), t('admin.chart.revenue'), t('admin.chart.units')]}
                rows={(data.by_category || []).map((r, i) => [categoryRows[i].label, usd(r.revenue), r.units])}
                numeric={[1, 2]}
              />
            )
          }
        >
          {categoryRows.length ? (
            <BarList rows={categoryRows} format={usd} label={t('admin.chart.categoryTitle')} />
          ) : (
            <p className="py-10 text-center text-sm text-muted">{t('admin.chart.empty')}</p>
          )}
        </ChartCard>
      </div>

      {/* Orders by status — each a shortcut into the filtered order list. */}
      <Panel title={t('admin.dashboard.byStatus')} className="mt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STATUSES.map((s) => {
            const n = data.status_counts[s] || 0;
            const urgent = s === 'pending' && n > 0;
            return (
              <Link
                key={s}
                to={`/admin/orders?status=${s}`}
                className={`flex flex-col gap-1 rounded-lg border p-3 transition-colors ${
                  urgent ? 'border-gold bg-gold-fill/10 hover:bg-gold-fill/15' : 'border-line hover:bg-admin-hover'
                }`}
              >
                <span className={`text-sm font-medium ${urgent ? 'text-gold' : 'text-muted'}`}>{t(`status.${s}`)}</span>
                <span className={`text-2xl font-semibold tabular-nums ${urgent ? 'text-gold' : 'text-foreground'}`}>{n}</span>
              </Link>
            );
          })}
        </div>
        {pending > 0 && <p className="mt-3 text-sm text-gold">{t('admin.dashboard.pendingNote', { n: pending })}</p>}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
        <Panel
          title={t('admin.dashboard.recent')}
          action={<SeeAll to="/admin/orders">{t('admin.dashboard.seeAll')}</SeeAll>}
        >
          {data.recent_orders.length === 0 ? (
            <p className="py-6 text-sm text-muted">{t('admin.orders.none')}</p>
          ) : (
            <TableWrap plain>
              <table className="w-full min-w-[420px] text-sm">
                <tbody>
                  {data.recent_orders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                      className={`${trCls} cursor-pointer transition-colors hover:bg-admin-hover`}
                    >
                      <td className={tdCls}>
                        <Link to={`/admin/orders/${o.id}`} className="text-foreground hover:text-gold" onClick={(e) => e.stopPropagation()}>
                          #{o.id}
                        </Link>
                        <div className="text-xs text-muted">{fmtDateTime(o.created_at)}</div>
                      </td>
                      <td className={`${tdCls} max-w-[10rem] truncate text-muted`}>{o.user?.name || o.user?.email || '—'}</td>
                      <td className={`${tdNumCls} text-foreground`}>{usd(o.total)}</td>
                      <td className={`${tdNumCls}`}><OrderStatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Panel>

        <Panel title={t('admin.dashboard.top')}>
          {data.top_products.length === 0 ? (
            <p className="py-6 text-sm text-muted">{t('admin.dashboard.noSales')}</p>
          ) : (
            <TableWrap plain>
              <table className="w-full min-w-[380px] text-sm">
                <thead>
                  <tr className={trCls}>
                    <th className={thCls}>{t('admin.products.colProduct')}</th>
                    <th className={thNumCls}>{t('admin.dashboard.units')}</th>
                    <th className={thNumCls}>{t('admin.dashboard.revenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_products.map((p) => (
                    <tr key={p.id ?? p.name} className={trCls}>
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <Thumb src={p.image_url} />
                          <span className="min-w-0 truncate text-foreground">{p.name}</span>
                        </div>
                      </td>
                      <td className={`${tdNumCls} text-muted`}>{p.units}</td>
                      <td className={`${tdNumCls} text-foreground`}>{usd(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Panel>
      </div>

      <Panel
        title={t('admin.dashboard.lowStock')}
        className="mt-6"
        action={
          isManager && (
            <SeeAll to="/admin/products?low=1">{t('admin.dashboard.seeAll')}</SeeAll>
          )
        }
      >
        {data.low_stock.length === 0 ? (
          <p className="py-6 text-sm text-muted">{t('admin.dashboard.stockFine')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.low_stock.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg border border-line p-3">
                <Thumb src={p.image_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{p.name}</p>
                  {p.sku && <p className="truncate text-xs text-muted">{p.sku}</p>}
                </div>
                <span className={`rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${p.stock <= 0 ? 'bg-danger/15 text-danger' : 'bg-gold-fill/15 text-gold'}`}>{p.stock}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AdminPage>
  );
}
