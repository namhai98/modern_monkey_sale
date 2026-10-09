import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import EmptyState from '../../components/EmptyState';
import ImageFallback from '../../components/ImageFallback';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import Skeleton from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { AdminPage, TableWrap, usd } from './kit';
import { btnGhost, thCls, thNumCls, tdCls, tdNumCls, trCls } from './ui';

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
const PERIODS = ['today', 'week', 'month'];

const fmtDateTime = (d) =>
  new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// A titled block on the dashboard, with an optional "see all" link.
function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`min-w-0 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <h2 className="micro tracking-button text-gold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Thumb({ src }) {
  return (
    <span className="block h-11 w-9 shrink-0 overflow-hidden border border-line bg-surface">
      {src && <ImageFallback src={src} alt="" className="h-full w-full object-cover" />}
    </span>
  );
}

/* The admin's landing page: what sold, what needs doing, what is running out. */
export default function AdminDashboard() {
  const { t } = useLocale();
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
        <EmptyState
          inline
          title={error}
          actions={<button type="button" onClick={load} className={btnGhost}>{t('admin.ui.retry')}</button>}
        />
      </AdminPage>
    );
  }

  if (!data) {
    return (
      <AdminPage title={t('admin.dashboard.title')}>
        <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
          {PERIODS.map((p) => <div key={p} className="bg-background p-6"><Skeleton className="h-16 w-full" /></div>)}
        </div>
        <div className="mt-12 grid gap-12 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminPage>
    );
  }

  const pending = data.status_counts.pending || 0;

  return (
    <AdminPage title={t('admin.dashboard.title')} count={t('admin.dashboard.subtitle')}>
      {/* Sales — hairline tiles, the figure in the serif. */}
      <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
        {PERIODS.map((p) => (
          <div key={p} className="bg-background p-6 md:p-7">
            <p className="micro tracking-meta text-muted">{t(`admin.dashboard.${p}`)}</p>
            <p className="heading-serif mt-3 text-3xl tabular-nums text-foreground">{usd(data.sales[p].revenue)}</p>
            <p className="mt-1.5 text-xs text-muted">{t('admin.dashboard.orderCount', { n: data.sales[p].orders })}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">{t('admin.dashboard.salesNote')}</p>

      {/* Orders by status — each a shortcut into the filtered order list. */}
      <Panel title={t('admin.dashboard.byStatus')} className="mt-12">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const n = data.status_counts[s] || 0;
            const urgent = s === 'pending' && n > 0;
            return (
              <Link
                key={s}
                to={`/admin/orders?status=${s}`}
                className={`inline-flex items-baseline gap-3 border px-4 py-2.5 transition-colors duration-300 ${
                  urgent ? 'border-gold text-gold hover:bg-surface' : 'border-line text-muted hover:border-gold/50 hover:text-foreground'
                }`}
              >
                <span className="micro tracking-meta">{t(`status.${s}`)}</span>
                <span className={`heading-serif text-lg tabular-nums ${urgent ? 'text-gold' : 'text-foreground'}`}>{n}</span>
              </Link>
            );
          })}
        </div>
        {pending > 0 && <p className="mt-3 text-xs text-gold">{t('admin.dashboard.pendingNote', { n: pending })}</p>}
      </Panel>

      <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-start">
        <Panel
          title={t('admin.dashboard.recent')}
          action={<Link to="/admin/orders" className="link-lux micro text-muted hover:text-gold">{t('admin.dashboard.seeAll')}</Link>}
        >
          {data.recent_orders.length === 0 ? (
            <p className="py-6 text-sm text-muted">{t('admin.orders.none')}</p>
          ) : (
            <TableWrap>
              <table className="w-full min-w-[420px] text-sm">
                <tbody>
                  {data.recent_orders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                      className={`${trCls} cursor-pointer transition-colors hover:bg-surface`}
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
            <TableWrap>
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
        className="mt-12"
        action={
          isManager && (
            <Link to="/admin/products?low=1" className="link-lux micro text-muted hover:text-gold">
              {t('admin.dashboard.seeAll')}
            </Link>
          )
        }
      >
        {data.low_stock.length === 0 ? (
          <p className="py-6 text-sm text-muted">{t('admin.dashboard.stockFine')}</p>
        ) : (
          <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {data.low_stock.map((p) => (
              <li key={p.id} className="flex items-center gap-3 bg-background p-4">
                <Thumb src={p.image_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{p.name}</p>
                  {p.sku && <p className="truncate text-xs text-muted">{p.sku}</p>}
                </div>
                <span className={`heading-serif text-xl tabular-nums ${p.stock <= 0 ? 'text-danger' : 'text-gold'}`}>{p.stock}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AdminPage>
  );
}
