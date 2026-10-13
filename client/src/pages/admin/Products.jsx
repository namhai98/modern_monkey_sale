import { Fragment, useCallback, useEffect, useState } from 'react';
import Button from '../../components/Button';
import client from '../../api/client';
import EmptyState from '../../components/EmptyState';
import ImageFallback from '../../components/ImageFallback';
import Icon from '../../components/Icon';
import Pager from '../../components/Pager';
import Skeleton from '../../components/Skeleton';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useLocale } from '../../context/LocaleContext';
import { categoryLabel } from '../../lib/i18n';
import { resizeUnsplash } from '../../lib/media';
import { ProductDrawer } from './ProductDrawer';
import { StatusToggle, LoadError, AdminPage, RowAction, SearchInput, Segmented, SelectField, SelectFilter, TableWrap, TextField, ToggleChip, Toolbar, usd, useDebounced } from './kit';
import { thCls, thNumCls, tdCls, tdNumCls, trCls } from './ui';

const LIMIT = 20;

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  sku: '',
  brand_id: '',
  gender: '',
  low_stock_threshold: 0,
  stock: 0,
};

// The shape the form edits, from a product as the API returns it.
const toForm = (p) => ({
  id: p.id,
  name: p.name,
  description: p.description || '',
  price: String(p.price),
  category_id: p.category?.id ? String(p.category.id) : '',
  sku: p.sku || '',
  brand_id: p.brand?.id ? String(p.brand.id) : '',
  gender: p.gender || '',
  low_stock_threshold: p.low_stock_threshold,
  images: p.images || [],
  variants: p.variants || [],
});

/* ── Stock adjustment (inline, under a row) ─────────────────────────────── */

function AdjustStock({ product, onDone, onCancel }) {
  const { t } = useLocale();
  const [mode, setMode] = useState('delta');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('restock');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const body = mode === 'delta'
      ? { delta: Number(amount), type, reason: reason || undefined }
      : { set: Number(amount), type, reason: reason || undefined };
    try {
      await client.patch(`/products/${product.id}/stock`, body);
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || t('admin.stock.failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="my-2 grid items-end gap-4 border border-line bg-surface p-4 text-sm sm:grid-cols-[10rem_7rem_10rem_1fr_auto_auto]">
      <SelectField label={t('admin.stock.how')} value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="delta">{t('admin.stock.changeBy')}</option>
        <option value="set">{t('admin.stock.setTo')}</option>
      </SelectField>
      <TextField label={t('admin.stock.amount')} type="number" step="1" placeholder="0" value={amount} required
        onChange={(e) => setAmount(e.target.value)} />
      <SelectField label={t('admin.stock.type')} value={type} onChange={(e) => setType(e.target.value)}>
        <option value="restock">{t('admin.stock.restock')}</option>
        <option value="adjustment">{t('admin.stock.adjustment')}</option>
        <option value="return">{t('admin.stock.return')}</option>
      </SelectField>
      <TextField label={t('admin.stock.reason')} placeholder={t('admin.stock.reasonPlaceholder')} value={reason}
        onChange={(e) => setReason(e.target.value)} />
      <Button size="xs" disabled={saving}>{t('admin.stock.apply')}</Button>
      <Button variant="outline-dark" size="xs" type="button" onClick={onCancel}>{t('admin.products.cancel')}</Button>
      {error && <span className="text-danger sm:col-span-6">{error}</span>}
    </form>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function AdminProducts() {
  const { t, locale } = useLocale();
  const { error: toastError } = useToast();
  const [data, setData] = useState({ items: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [status, setStatus] = useState('all'); // 'all' | 'active'
  // The dashboard's low-stock list links here as ?low=1.
  const [params] = useSearchParams();
  const [lowOnly, setLowOnly] = useState(() => params.get('low') === '1');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const [formFor, setFormFor] = useState(null); // 'new' | form object | null
  const [adjustId, setAdjustId] = useState(null);

  useEffect(() => { setPage(1); }, [q, category, brand, status, lowOnly]);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get('/products', {
        params: {
          ...(q ? { search: q } : {}),
          ...(category ? { category } : {}),
          ...(brand ? { brand } : {}),
          ...(status === 'all' ? { include_inactive: 1 } : {}),
          ...(lowOnly ? { low_stock: 1 } : {}),
          page,
          limit: LIMIT,
          sort: 'created_at',
          order: 'desc',
        },
      })
      .then((res) => {
        setData({ items: res.data.items, total: res.data.total ?? res.data.items.length });
        setError(null);
      })
      .catch((err) => setError(err.response?.data?.error || t('admin.products.loadFailed')))
      .finally(() => setLoading(false));
  }, [q, category, brand, status, lowOnly, page, t]);

  useEffect(() => {
    client.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
    client.get('/brands').then((res) => setBrands(res.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggleActive(p) {
    try {
      await client.patch(`/products/${p.id}`, { is_active: !p.is_active });
      load();
    } catch (err) {
      toastError(err.response?.data?.error || t('admin.products.updateFailed'));
    }
  }

  function afterSave(created) {
    load();
    // Just created — keep the panel open in edit mode so photos and sizes
    // can be added straight away.
    if (created?.id) setFormFor(toForm(created));
    else setFormFor(null);
  }

  const filtered = Boolean(search || category || brand || status !== 'all' || lowOnly);
  const clear = () => { setSearch(''); setCategory(''); setBrand(''); setStatus('all'); setLowOnly(false); };
  const totalPages = Math.max(1, Math.ceil(data.total / LIMIT));

  return (
    <AdminPage
      title={t('admin.products.title')}
      count={t('admin.products.count', { n: data.total })}
      actions={
        <Button size="xs" onClick={() => setFormFor('new')}>
          <Icon name="plus" className="h-3.5 w-3.5" />
          {t('admin.products.new')}
        </Button>
      }
    >
      <Toolbar active={filtered} onClear={clear}>
        <SearchInput value={search} onChange={setSearch} placeholder={t('admin.products.searchPlaceholder')} />
        <SelectFilter label={t('admin.products.colCategory')} value={category} onChange={setCategory}>
          <option value="">{t('admin.ui.all')}</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{categoryLabel(locale, c)}</option>)}
        </SelectFilter>
        <SelectFilter label={t('admin.products.labelBrand')} value={brand} onChange={setBrand}>
          <option value="">{t('admin.ui.all')}</option>
          {brands.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
        </SelectFilter>
        <Segmented
          label={t('admin.products.colStatus')}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: t('admin.ui.all') },
            { value: 'active', label: t('admin.products.active') },
          ]}
        />
        <ToggleChip checked={lowOnly} onChange={setLowOnly}>{t('admin.products.lowStockOnly')}</ToggleChip>
      </Toolbar>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}
      {error && <LoadError message={error} onRetry={load} />}

      {!loading && !error && data.items.length === 0 && (
        <EmptyState inline title={t('admin.products.none')} />
      )}

      {!loading && !error && data.items.length > 0 && (
        <>
          <TableWrap stickyFirst>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className={trCls}>
                  <th className={thCls}>{t('admin.products.colProduct')}</th>
                  <th className={thCls}>{t('admin.products.colCategory')}</th>
                  <th className={thNumCls}>{t('admin.products.colPrice')}</th>
                  <th className={thNumCls}>{t('admin.products.colStock')}</th>
                  <th className={thCls}>{t('admin.products.colStatus')}</th>
                  <th className={thNumCls}><span className="sr-only">{t('admin.action')}</span></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => {
                  const thumb = p.images?.[0]?.thumbnail || resizeUnsplash(p.image_url, 120);
                  return (
                    <Fragment key={p.id}>
                      <tr className={`${trCls} transition-colors hover:bg-surface ${p.is_active ? '' : 'opacity-60'}`}>
                        <td className={tdCls}>
                          <div className="flex items-center gap-3">
                            <ImageFallback src={thumb} alt="" className="h-14 w-11 shrink-0 bg-surface object-cover" />
                            <div className="min-w-0">
                              <button type="button" onClick={() => setFormFor(toForm(p))}
                                className="font-catalog text-left font-medium text-foreground transition-colors hover:text-gold">
                                {p.name}
                              </button>
                              {p.sku && <div className="text-xs text-muted">{p.sku}</div>}
                            </div>
                          </div>
                        </td>
                        <td className={`${tdCls} text-muted`}>
                          <div className="text-foreground">{p.category ? categoryLabel(locale, p.category) : '—'}</div>
                          <div className="text-xs">
                            {[p.brand?.name, p.gender && t(`gender.${p.gender}`)].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td className={`${tdNumCls} text-foreground`}>{usd(p.price)}</td>
                        <td className={`${tdNumCls} whitespace-nowrap`}>
                          <div className={`tabular-nums ${p.low_stock ? 'font-medium text-gold' : 'text-foreground'}`}>
                            {p.stock}
                            {p.low_stock && <span className="micro ml-1.5 text-badge">{t('admin.products.low')}</span>}
                          </div>
                          {p.has_variants ? (
                            <div className="text-xs text-muted">{t('admin.products.perSize')}</div>
                          ) : (
                            <button onClick={() => setAdjustId(adjustId === p.id ? null : p.id)}
                              className="link-lux text-xs text-muted hover:text-gold">
                              {t('admin.products.adjust')}
                            </button>
                          )}
                        </td>
                        <td className={tdCls}>
                          <StatusToggle
                            on={p.is_active}
                            onClick={() => toggleActive(p)}
                            action={p.is_active ? t('admin.products.deactivate') : t('admin.products.activate')}
                          >
                            {p.is_active ? t('admin.products.active') : t('admin.products.inactive')}
                          </StatusToggle>
                        </td>
                        <td className={tdNumCls}>
                          <RowAction icon="edit" label={t('admin.products.edit')} onClick={() => setFormFor(toForm(p))} />
                        </td>
                      </tr>
                      {adjustId === p.id && (
                        <tr>
                          <td colSpan={6}>
                            <AdjustStock product={p} onCancel={() => setAdjustId(null)}
                              onDone={() => { setAdjustId(null); load(); }} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
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

      {formFor && (
        <ProductDrawer
          key={formFor === 'new' ? 'new' : formFor.id}
          categories={categories}
          brands={brands}
          initial={formFor === 'new' ? emptyForm : formFor}
          onClose={() => setFormFor(null)}
          onSaved={afterSave}
        />
      )}
    </AdminPage>
  );
}
