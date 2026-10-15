import { useState } from 'react';
import Button from '../../components/Button';
import client from '../../api/client';
import ImageFallback from '../../components/ImageFallback';
import Icon from '../../components/Icon';
import { useLocale } from '../../context/LocaleContext';
import { categoryLabel } from '../../lib/i18n';
import { Drawer, FormSection, RowAction, SelectField, TextField } from './kit';
import { inputCls, thCls, thNumCls, tdCls, tdNumCls, trCls } from './ui';

const MAX_IMAGES = 5;

const kb = (bytes) => (bytes ? `${Math.round(bytes / 1024)} KB` : '');

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
          <div key={im.id} className="text-meta text-muted">
            <div className="relative">
              <ImageFallback
                src={im.thumbnail}
                alt=""
                className={`aspect-[4/5] w-full border object-cover ${i === 0 ? 'border-gold' : 'border-line'}`}
              />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-gold-fill px-1.5 py-0.5 text-[0.65rem] font-semibold text-ink">
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
        <Button size="xs" disabled={busy}>{t('admin.variants.add')}</Button>
      </form>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

/* ── Create / edit panel ────────────────────────────────────────────────── */

export function ProductDrawer({ categories, brands, initial, onClose, onSaved }) {
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
          <Button size="xs" type="submit" form="product-form" disabled={saving}>
            {saving ? t('admin.products.saving') : editing ? t('admin.products.saveChanges') : t('admin.products.create')}
          </Button>
          <Button variant="outline-dark" size="xs" type="button" onClick={onClose}>
            {editing ? t('admin.products.close') : t('admin.products.cancel')}
          </Button>
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
