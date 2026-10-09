import { Fragment, useCallback, useEffect, useState } from 'react';
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
import {
  AdminPage, Drawer, FormSection, RowAction, SearchInput, Segmented, SelectField, SelectFilter,
  StatusPill, TableWrap, TextField, ToggleChip, Toolbar, usd, useDebounced,
} from './kit';
import { inputCls, btnPrimary, btnGhost, thCls, thNumCls, tdCls, tdNumCls, trCls } from './ui';

const MAX_IMAGES = 5;
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

const kb = (bytes) => (bytes ? `${Math.round(bytes / 1024)} KB` : '');

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

/* ── Photos ─────────────────────────────────────────────────────────────── */

// Talks to /api/products/:id/images — upload, delete, reorder, set primary.
function ProductImageManager({ productId, images: initialImages }) {
  const { t } = useLocale();
  const [images, setImages] = useState(initialImages || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run(fn) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      setImages(res.data.images);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.images.error'));
    } finally {
      setBusy(false);
    }
  }

  function upload(file) {
    if (!file) return;
    const data = new FormData();
    data.append('image', file);
    run(() => client.post(`/products/${productId}/images`, data));
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const order = images.map((im) => im.id);
    [order[i], order[j]] = [order[j], order[i]];
    run(() => client.patch(`/products/${productId}/images/reorder`, { order }));
  }

  const ctl = 'inline-flex h-7 w-7 items-center justify-center text-muted transition-colors hover:text-gold disabled:opacity-30';

  return (
    <div>
      <p className="mb-4 text-xs text-muted">{t('admin.images.count', { n: images.length, max: MAX_IMAGES })}</p>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((im, i) => (
          <div key={im.id} className="text-[11px] text-muted">
            <div className="relative">
              <ImageFallback
                src={im.thumbnail}
                alt=""
                className={`aspect-[4/5] w-full border object-cover ${i === 0 ? 'border-gold' : 'border-line'}`}
              />
              {i === 0 && (
                <span className="micro absolute left-0 top-0 bg-gold px-1.5 py-0.5 text-[10px] text-ink">
                  {t('admin.images.primary')}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} className={ctl}
                aria-label={t('admin.images.moveLeft')}>
                <Icon name="arrowRight" className="h-3.5 w-3.5 rotate-180" />
              </button>
              <button type="button" disabled={busy}
                onClick={() => run(() => client.delete(`/products/${productId}/images/${im.id}`))}
                className={`${ctl} hover:!text-danger`} aria-label={t('admin.images.delete')}>
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
              <button type="button" disabled={busy || i === images.length - 1} onClick={() => move(i, 1)} className={ctl}
                aria-label={t('admin.images.moveRight')}>
                <Icon name="arrowRight" className="h-3.5 w-3.5" />
              </button>
            </div>
            {i !== 0 && (
              <button type="button" disabled={busy}
                onClick={() => run(() => client.patch(`/products/${productId}/images/${im.id}/primary`))}
                className="link-lux mt-0.5 text-foreground hover:text-gold">
                {t('admin.images.setPrimary')}
              </button>
            )}
            <div className="mt-0.5">{[im.width && im.height ? `${im.width}×${im.height}` : '', kb(im.file_size)].filter(Boolean).join(' · ')}</div>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-line text-center text-xs text-muted transition-colors hover:border-gold hover:text-gold">
            <Icon name="plus" className="h-5 w-5" />
            {busy ? t('admin.images.working') : t('admin.images.upload')}
            <input type="file" accept="image/jpeg,image/png" className="hidden" disabled={busy}
              onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

/* ── Sizes ──────────────────────────────────────────────────────────────── */

// Talks to /api/products/:id/variants — add / edit stock / delete size runs.
// Its own <form>, kept outside the product form: nested forms submit both.
function ProductVariantManager({ productId, variants: initial }) {
  const { t } = useLocale();
  const [variants, setVariants] = useState(initial || []);
  const [draft, setDraft] = useState({ label: '', sku: '', stock: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run(fn) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      setVariants(res.data.variants);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.variants.error'));
    } finally {
      setBusy(false);
    }
  }

  function add(e) {
    e.preventDefault();
    if (!draft.label.trim()) return;
    run(() =>
      client.post(`/products/${productId}/variants`, {
        label: draft.label.trim(),
        sku: draft.sku.trim() || null,
        stock: Number(draft.stock) || 0,
      })
    ).then(() => setDraft({ label: '', sku: '', stock: 0 }));
  }

  const setStock = (v, stock) => run(() => client.patch(`/products/${productId}/variants/${v.id}`, { stock }));

  return (
    <div>
      <p className="mb-4 text-xs leading-relaxed text-muted">{t('admin.variants.hint')}</p>

      {variants.length > 0 && (
        <table className="mb-5 w-full text-sm">
          <thead>
            <tr className={trCls}>
              <th className={thCls}>{t('admin.variants.size')}</th>
              <th className={thCls}>{t('admin.variants.sku')}</th>
              <th className={`${thCls} w-28`}>{t('admin.variants.stock')}</th>
              <th className={thNumCls} />
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className={trCls}>
                <td className={`${tdCls} font-medium text-foreground`}>{v.label}</td>
                <td className={`${tdCls} text-muted`}>{v.sku || '—'}</td>
                <td className={tdCls}>
                  <input
                    type="number"
                    min="0"
                    defaultValue={v.stock}
                    disabled={busy}
                    aria-label={`${t('admin.variants.stock')} ${v.label}`}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isInteger(n) && n >= 0 && n !== v.stock) setStock(v, n);
                    }}
                    className={`${inputCls} w-20 tabular-nums`}
                  />
                </td>
                <td className={tdNumCls}>
                  <RowAction icon="trash" danger label={t('admin.variants.delete')} disabled={busy}
                    onClick={() => run(() => client.delete(`/products/${productId}/variants/${v.id}`))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={add} className="grid grid-cols-[1fr_1.4fr_0.8fr_auto] items-end gap-3">
        <TextField label={t('admin.variants.size')} value={draft.label} placeholder="M"
          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
        <TextField label={t('admin.variants.sku')} value={draft.sku} placeholder={t('admin.variants.skuPlaceholder')}
          onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))} />
        <TextField label={t('admin.variants.stock')} type="number" min="0" value={draft.stock}
          onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))} />
        <button className={btnPrimary} disabled={busy}>{t('admin.variants.add')}</button>
      </form>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

/* ── Create / edit panel ────────────────────────────────────────────────── */

function ProductDrawer({ categories, brands, initial, onClose, onSaved }) {
  const { t, locale } = useLocale();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(initial.id);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      category_id: form.category_id ? Number(form.category_id) : null,
      sku: form.sku || null,
      brand_id: form.brand_id ? Number(form.brand_id) : null,
      gender: form.gender || null,
      low_stock_threshold: Number(form.low_stock_threshold) || 0,
    };
    try {
      if (editing) {
        await client.patch(`/products/${initial.id}`, payload);
        onSaved();
      } else {
        const res = await client.post('/products', { ...payload, stock: Number(form.stock) || 0 });
        onSaved(res.data); // the parent re-opens it in edit mode so photos can be added
      }
    } catch (err) {
      setError(err.response?.data?.error || t('admin.products.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open
      wide
      title={editing ? initial.name : t('admin.products.newTitle')}
      subtitle={editing ? [initial.sku, t('admin.products.editing')].filter(Boolean).join(' · ') : t('admin.products.newHint')}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center gap-3">
          {/* form="…": the save button lives in the panel footer, outside the
              <form>, so it stays in view however long the panel scrolls. */}
          <button type="submit" form="product-form" className={btnPrimary} disabled={saving}>
            {saving ? t('admin.products.saving') : editing ? t('admin.products.saveChanges') : t('admin.products.create')}
          </button>
          <button type="button" onClick={onClose} className={btnGhost}>
            {editing ? t('admin.products.close') : t('admin.products.cancel')}
          </button>
          {error && <p className="w-full text-sm text-danger">{error}</p>}
        </div>
      }
    >
      <form id="product-form" onSubmit={submit} className="font-catalog">
        <FormSection title={t('admin.products.secBasic')}>
          <TextField className="sm:col-span-2" label={t('admin.products.labelName')} required
            value={form.name} onChange={(e) => set('name', e.target.value)} />
          <TextField label={t('admin.products.labelSku')} hint={t('admin.products.skuHint')}
            value={form.sku} onChange={(e) => set('sku', e.target.value)} />
          <TextField label={t('admin.products.labelPrice')} hint={t('admin.products.priceHint')} required
            type="number" step="0.01" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} />
          <TextField as="textarea" rows={3} className="sm:col-span-2" label={t('admin.products.labelDescription')}
            value={form.description} onChange={(e) => set('description', e.target.value)} />
        </FormSection>

        <FormSection title={t('admin.products.secClass')}>
          <SelectField label={t('admin.products.colCategory')} value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">{t('admin.products.noCategory')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{categoryLabel(locale, c)}</option>
            ))}
          </SelectField>
          <SelectField label={t('admin.products.labelBrand')} value={form.brand_id || ''} onChange={(e) => set('brand_id', e.target.value)}>
            <option value="">{t('admin.products.noBrand')}</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </SelectField>
          <SelectField label={t('filter.gender')} value={form.gender || ''} onChange={(e) => set('gender', e.target.value)}>
            <option value="">{t('admin.products.genderNone')}</option>
            <option value="women">{t('gender.women')}</option>
            <option value="men">{t('gender.men')}</option>
            <option value="unisex">{t('gender.unisex')}</option>
          </SelectField>
        </FormSection>

        <FormSection title={t('admin.products.secStock')}>
          {!editing && (
            <TextField label={t('admin.products.labelStock')} type="number" min="0"
              value={form.stock ?? ''} onChange={(e) => set('stock', e.target.value)} />
          )}
          <TextField label={t('admin.products.lowStockThreshold')} hint={t('admin.products.lowStockHint')}
            type="number" min="0" value={form.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value)} />
        </FormSection>
      </form>

      {/* Photos and sizes save as they change, each through its own endpoint,
          so they sit outside the product form. */}
      {editing ? (
        <>
          <FormSection title={t('admin.products.secImages')} cols={1}>
            <ProductImageManager productId={initial.id} images={initial.images || []} />
          </FormSection>
          <FormSection title={t('admin.products.secSizes')} cols={1}>
            <ProductVariantManager productId={initial.id} variants={initial.variants || []} />
          </FormSection>
        </>
      ) : (
        <p className="mt-8 border-l-2 border-gold py-1 pl-4 text-sm text-muted">{t('admin.products.saveFirst')}</p>
      )}
    </Drawer>
  );
}

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
      <button className={btnPrimary} disabled={saving}>{t('admin.stock.apply')}</button>
      <button type="button" onClick={onCancel} className={btnGhost}>{t('admin.products.cancel')}</button>
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
        <button onClick={() => setFormFor('new')} className={`${btnPrimary} gap-2`}>
          <Icon name="plus" className="h-3.5 w-3.5" />
          {t('admin.products.new')}
        </button>
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
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && data.items.length === 0 && (
        <EmptyState inline title={t('admin.products.none')} />
      )}

      {!loading && !error && data.items.length > 0 && (
        <>
          <TableWrap>
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
                            {p.low_stock && <span className="micro ml-1.5 text-[10px]">{t('admin.products.low')}</span>}
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
                          <button type="button" onClick={() => toggleActive(p)}
                            aria-label={p.is_active ? t('admin.products.deactivate') : t('admin.products.activate')}
                            title={p.is_active ? t('admin.products.deactivate') : t('admin.products.activate')}>
                            <StatusPill on={p.is_active}>
                              {p.is_active ? t('admin.products.active') : t('admin.products.inactive')}
                            </StatusPill>
                          </button>
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
