import { Fragment, useCallback, useEffect, useState } from 'react';
import client from '../../api/client';
import ImageFallback from '../../components/ImageFallback';
import Select from '../../components/Select';
import Icon from '../../components/Icon';
import { useToast } from '../../context/ToastContext';
import { useLocale } from '../../context/LocaleContext';
import { inputCls, btnPrimary, btnGhost } from './ui';

const MAX_IMAGES = 5;
const emptyForm = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  sku: '',
  brand_id: '',
  gender: '',
  low_stock_threshold: 0,
};

function kb(bytes) {
  return bytes ? `${Math.round(bytes / 1024)} KB` : '';
}

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

  return (
    <div className="md:col-span-2 border-t border-line pt-3">
      <p className="text-xs text-muted mb-2">
        {t('admin.images.count', { n: images.length, max: MAX_IMAGES })}
      </p>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {images.map((im, i) => (
            <div key={im.id} className="w-24 text-[11px] text-muted">
              <div className="relative">
                <ImageFallback
                  src={im.thumbnail}
                  alt=""
                  className={`h-28 w-24 object-cover border ${
                    i === 0 ? 'border-gold' : 'border-line'
                  }`}
                />
                {i === 0 && (
                  <span className="absolute top-1 left-1 bg-foreground text-background px-1 text-[10px]">
                    {t('admin.images.primary')}
                  </span>
                )}
              </div>
              <div className="flex justify-between mt-1">
                <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)}
                  className="px-1 text-foreground disabled:opacity-30">←</button>
                {i !== 0 && (
                  <button type="button" disabled={busy}
                    onClick={() => run(() => client.patch(`/products/${productId}/images/${im.id}/primary`))}
                    className="text-foreground hover:text-gold">{t('admin.images.setPrimary')}</button>
                )}
                <button type="button" disabled={busy || i === images.length - 1} onClick={() => move(i, 1)}
                  className="px-1 text-foreground disabled:opacity-30">→</button>
              </div>
              <div className="flex justify-between mt-0.5">
                <span>{im.width && im.height ? `${im.width}×${im.height}` : ''}</span>
                <button type="button" disabled={busy}
                  onClick={() => run(() => client.delete(`/products/${productId}/images/${im.id}`))}
                  className="text-danger transition-opacity duration-300 hover:opacity-70">{t('admin.images.delete')}</button>
              </div>
              {im.file_size ? <div>{kb(im.file_size)}</div> : null}
            </div>
          ))}
        </div>
      )}

      {images.length < MAX_IMAGES && (
        <label className="inline-block text-sm text-muted cursor-pointer border border-line px-3 py-2 transition-colors hover:bg-surface hover:text-foreground">
          {busy ? t('admin.images.working') : t('admin.images.upload')}
          <input type="file" accept="image/jpeg,image/png" className="hidden" disabled={busy}
            onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      )}
      {error && <p className="text-danger text-sm mt-2">{error}</p>}
    </div>
  );
}

// Talks to /api/products/:id/variants — add / edit stock / delete size runs.
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
    <div className="md:col-span-2 border-t border-line pt-3">
      <p className="text-xs text-muted mb-2">{t('admin.variants.hint')}</p>

      {variants.length > 0 && (
        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="text-left micro text-muted">
              <th className="py-1 font-normal">{t('admin.variants.size')}</th><th className="py-1 font-normal">{t('admin.variants.sku')}</th>
              <th className="py-1 w-28 font-normal">{t('admin.variants.stock')}</th><th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="border-t border-line/60">
                <td className="py-1.5 font-medium text-foreground">{v.label}</td>
                <td className="py-1.5 text-muted">{v.sku || '—'}</td>
                <td className="py-1.5">
                  <input
                    type="number"
                    min="0"
                    defaultValue={v.stock}
                    disabled={busy}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isInteger(n) && n >= 0 && n !== v.stock) setStock(v, n);
                    }}
                    className="border border-line bg-transparent px-2 py-1 w-20 text-sm text-foreground focus:outline-none focus:border-gold"
                  />
                </td>
                <td className="py-1.5 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => client.delete(`/products/${productId}/variants/${v.id}`))}
                    className="text-danger transition-opacity duration-300 hover:opacity-70 text-xs"
                  >
                    {t('admin.variants.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={add} className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} w-24`}
          placeholder={t('admin.variants.sizePlaceholder')}
          value={draft.label}
          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
        />
        <input
          className={`${inputCls} w-40`}
          placeholder={t('admin.variants.skuPlaceholder')}
          value={draft.sku}
          onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
        />
        <input
          className={`${inputCls} w-20`}
          type="number"
          min="0"
          placeholder={t('admin.variants.stockPlaceholder')}
          value={draft.stock}
          onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
        />
        <button className={btnPrimary} disabled={busy}>
          {t('admin.variants.add')}
        </button>
      </form>
      {error && <p className="text-danger text-sm mt-2">{error}</p>}
    </div>
  );
}

function ProductForm({ categories, brands, initial, onCancel, onSaved }) {
  const { t } = useLocale();
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
        onSaved(res.data); // parent re-opens in edit mode so images can be added
      }
    } catch (err) {
      setError(err.response?.data?.error || t('admin.products.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-line bg-surface p-4 mb-6 grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2 heading-serif text-lg text-foreground">
        {editing ? t('admin.products.editTitle', { name: initial.name }) : t('admin.products.newTitle')}
      </div>
      <input className={inputCls} placeholder={t('admin.products.namePlaceholder')} value={form.name}
        onChange={(e) => set('name', e.target.value)} required />
      <input className={inputCls} placeholder={t('admin.products.skuPlaceholder')} value={form.sku}
        onChange={(e) => set('sku', e.target.value)} />
      <input className={inputCls} type="number" step="0.01" min="0" placeholder={t('admin.products.pricePlaceholder')} value={form.price}
        onChange={(e) => set('price', e.target.value)} required />
      <Select value={form.category_id}
        onChange={(e) => set('category_id', e.target.value)}>
        <option value="">{t('admin.products.noCategory')}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>
      <Select value={form.brand_id || ''}
        onChange={(e) => set('brand_id', e.target.value)}>
        <option value="">{t('admin.products.noBrand')}</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </Select>
      <Select value={form.gender || ''}
        onChange={(e) => set('gender', e.target.value)}>
        <option value="">{t('admin.products.genderPlaceholder')}</option>
        <option value="women">{t('gender.women')}</option>
        <option value="men">{t('gender.men')}</option>
        <option value="unisex">{t('gender.unisex')}</option>
      </Select>
      {!editing && (
        <input className={inputCls} type="number" min="0" placeholder={t('admin.products.stockPlaceholder')} value={form.stock ?? ''}
          onChange={(e) => set('stock', e.target.value)} />
      )}
      <input className={inputCls} type="number" min="0" placeholder={t('admin.products.lowStockThreshold')}
        value={form.low_stock_threshold}
        onChange={(e) => set('low_stock_threshold', e.target.value)} />
      <textarea className={`${inputCls} md:col-span-2`} rows={2} placeholder={t('admin.products.descriptionPlaceholder')}
        value={form.description} onChange={(e) => set('description', e.target.value)} />

      {editing ? (
        <>
          <ProductImageManager productId={initial.id} images={initial.images || []} />
          <ProductVariantManager productId={initial.id} variants={initial.variants || []} />
        </>
      ) : (
        <p className="md:col-span-2 text-xs text-muted border-t border-line pt-3">
          {t('admin.products.saveFirst')}
        </p>
      )}

      {error && <p className="md:col-span-2 text-danger text-sm">{error}</p>}
      <div className="md:col-span-2 flex gap-2">
        <button className={btnPrimary} disabled={saving}>
          {saving ? t('admin.products.saving') : editing ? t('admin.products.saveChanges') : t('admin.products.create')}
        </button>
        <button type="button" onClick={onCancel} className={btnGhost}>
          {editing ? t('admin.products.close') : t('admin.products.cancel')}
        </button>
      </div>
    </form>
  );
}

function AdjustStock({ product, onDone }) {
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
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 bg-surface border border-line p-3 text-sm">
      <Select className="w-32" value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="delta">{t('admin.stock.changeBy')}</option>
        <option value="set">{t('admin.stock.setTo')}</option>
      </Select>
      <input className={`${inputCls} w-24`} type="number" step="1" placeholder="0" value={amount}
        onChange={(e) => setAmount(e.target.value)} required />
      <Select className="w-36" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="restock">{t('admin.stock.restock')}</option>
        <option value="adjustment">{t('admin.stock.adjustment')}</option>
        <option value="return">{t('admin.stock.return')}</option>
      </Select>
      <input className={`${inputCls} flex-1 min-w-[8rem]`} placeholder={t('admin.stock.reasonPlaceholder')} value={reason}
        onChange={(e) => setReason(e.target.value)} />
      <button className={btnPrimary} disabled={saving}>
        {t('admin.stock.apply')}
      </button>
      {error && <span className="text-danger w-full">{error}</span>}
    </form>
  );
}

export default function AdminProducts() {
  const { t } = useLocale();
  const { error: toastError } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [lowOnly, setLowOnly] = useState(false);

  const [formFor, setFormFor] = useState(null); // 'new' | product object | null
  const [adjustId, setAdjustId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get('/products', {
        params: {
          ...(search ? { search } : {}),
          ...(showInactive ? { include_inactive: 1 } : {}),
          ...(lowOnly ? { low_stock: 1 } : {}),
          limit: 100,
          sort: 'created_at',
          order: 'desc',
        },
      })
      .then((res) => {
        setProducts(res.data.items);
        setError(null);
      })
      .catch((err) => setError(err.response?.data?.error || t('admin.products.loadFailed')))
      .finally(() => setLoading(false));
  }, [search, showInactive, lowOnly, t]);

  useEffect(() => {
    client.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
    client.get('/brands').then((res) => setBrands(res.data)).catch(() => {});
  }, []);
  useEffect(() => {
    load();
  }, [load]);

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
    if (created?.id) {
      // just created — switch the form to edit mode so images can be attached
      setFormFor({
        id: created.id,
        name: created.name,
        description: created.description || '',
        price: String(created.price),
        category_id: created.category?.id ? String(created.category.id) : '',
        sku: created.sku || '',
        brand_id: created.brand?.id ? String(created.brand.id) : '',
        gender: created.gender || '',
        low_stock_threshold: created.low_stock_threshold,
        images: created.images || [],
        variants: created.variants || [],
      });
    } else {
      setFormFor(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto pt-10 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="heading-serif text-2xl text-foreground">{t('admin.products.title')}</h1>
        <button
          onClick={() => setFormFor(formFor === 'new' ? null : 'new')}
          className={btnPrimary}
        >
          {formFor === 'new' ? t('admin.products.close') : t('admin.products.new')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
        <input className={inputCls} placeholder={t('admin.products.searchPlaceholder')} value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-1.5 text-muted">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          {t('admin.products.showInactive')}
        </label>
        <label className="flex items-center gap-1.5 text-muted">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          {t('admin.products.lowStockOnly')}
        </label>
      </div>

      {formFor === 'new' && (
        <ProductForm categories={categories} brands={brands} initial={{ ...emptyForm, stock: 0 }}
          onCancel={() => setFormFor(null)} onSaved={afterSave} />
      )}
      {/* freshly created product not yet in the loaded list — keep the form up so images can be added */}
      {formFor && formFor.id && !products.some((p) => p.id === formFor.id) && (
        <ProductForm categories={categories} brands={brands} initial={formFor}
          onCancel={() => setFormFor(null)} onSaved={afterSave} />
      )}

      {loading && <p className="text-muted">{t('admin.products.loading')}</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left micro text-muted border-b border-line">
              <th className="py-3 font-normal">{t('admin.products.colProduct')}</th>
              <th className="py-3 font-normal">{t('admin.products.colCategory')}</th>
              <th className="py-3 font-normal">{t('admin.products.colPrice')}</th>
              <th className="py-3 font-normal">{t('admin.products.colStock')}</th>
              <th className="py-3 font-normal">{t('admin.products.colStatus')}</th>
              <th className="py-3 text-right font-normal">{t('admin.action')}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <Fragment key={p.id}>
                <tr className={`border-b border-line/60 transition-colors hover:bg-surface ${p.is_active ? 'text-foreground' : 'text-muted'}`}>
                  <td className="py-3">
                    <div className="font-medium">{p.name}</div>
                    {p.sku && <div className="text-xs text-muted">{p.sku}</div>}
                  </td>
                  <td className="py-3 text-muted">
                    {p.category?.name || '—'}
                    {p.brand && <span className="text-xs"> · {p.brand.name}</span>}
                    {p.gender && <span className="text-xs"> · {t(`gender.${p.gender}`)}</span>}
                  </td>
                  <td className="py-3">${p.price.toFixed(2)}</td>
                  <td className="py-3">
                    <span className={p.low_stock ? 'text-gold font-medium' : ''}>{p.stock}</span>
                    {p.low_stock && <span className="text-xs text-gold"> {t('admin.products.low')}</span>}
                    {p.has_variants ? (
                      <span className="ml-2 text-xs text-muted">{t('admin.products.perSize')}</span>
                    ) : (
                      <button onClick={() => setAdjustId(adjustId === p.id ? null : p.id)}
                        className="ml-2 text-xs text-muted hover:text-gold">
                        {adjustId === p.id ? t('admin.products.closeLower') : t('admin.products.adjust')}
                      </button>
                    )}
                  </td>
                  <td className="py-3">
                    <button onClick={() => toggleActive(p)}
                      className={p.is_active ? 'text-gold transition-opacity duration-300 hover:opacity-70' : 'text-danger transition-opacity duration-300 hover:opacity-70'}>
                      {p.is_active ? t('admin.products.active') : t('admin.products.inactive')}
                    </button>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() =>
                        setFormFor(
                          formFor && formFor.id === p.id
                            ? null
                            : {
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
                              }
                        )
                      }
                      className="inline-flex text-muted transition-colors hover:text-gold"
                      aria-label={t('admin.products.edit')}
                      title={t('admin.products.edit')}
                    >
                      <Icon name="edit" />
                    </button>
                  </td>
                </tr>
                {adjustId === p.id && (
                  <tr>
                    <td colSpan={6} className="pb-3">
                      <AdjustStock product={p} onDone={() => { setAdjustId(null); load(); }} />
                    </td>
                  </tr>
                )}
                {formFor && formFor.id === p.id && (
                  <tr>
                    <td colSpan={6}>
                      <ProductForm categories={categories} brands={brands} initial={formFor}
                        onCancel={() => setFormFor(null)} onSaved={afterSave} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
