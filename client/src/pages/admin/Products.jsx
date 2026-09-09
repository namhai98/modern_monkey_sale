import { Fragment, useCallback, useEffect, useState } from 'react';
import client from '../../api/client';
import AdminNav from '../../components/AdminNav';
import ImageFallback from '../../components/ImageFallback';
import { useToast } from '../../context/ToastContext';

const inputCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm';
const MAX_IMAGES = 5;
const emptyForm = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  sku: '',
  brand: '',
  gender: '',
  low_stock_threshold: 0,
};

function kb(bytes) {
  return bytes ? `${Math.round(bytes / 1024)} KB` : '';
}

// Talks to /api/products/:id/images — upload, delete, reorder, set primary.
function ProductImageManager({ productId, images: initialImages }) {
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
      setError(err.response?.data?.error || 'Something went wrong');
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
    <div className="md:col-span-2 border-t border-gray-100 pt-3">
      <p className="text-xs text-gray-500 mb-2">
        Images ({images.length}/{MAX_IMAGES}) — the first is the primary image. JPG or PNG, up to 10&nbsp;MB;
        stored as optimised WebP.
      </p>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {images.map((im, i) => (
            <div key={im.id} className="w-24 text-[11px] text-gray-500">
              <div className="relative">
                <ImageFallback
                  src={im.thumbnail}
                  alt=""
                  className={`h-28 w-24 object-cover rounded border ${
                    i === 0 ? 'border-gray-900' : 'border-gray-200'
                  }`}
                />
                {i === 0 && (
                  <span className="absolute top-1 left-1 bg-gray-900 text-white px-1 rounded text-[10px]">
                    Primary
                  </span>
                )}
              </div>
              <div className="flex justify-between mt-1">
                <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)}
                  className="px-1 disabled:opacity-30">←</button>
                {i !== 0 && (
                  <button type="button" disabled={busy}
                    onClick={() => run(() => client.patch(`/products/${productId}/images/${im.id}/primary`))}
                    className="hover:underline">Set primary</button>
                )}
                <button type="button" disabled={busy || i === images.length - 1} onClick={() => move(i, 1)}
                  className="px-1 disabled:opacity-30">→</button>
              </div>
              <div className="flex justify-between mt-0.5">
                <span>{im.width && im.height ? `${im.width}×${im.height}` : ''}</span>
                <button type="button" disabled={busy}
                  onClick={() => run(() => client.delete(`/products/${productId}/images/${im.id}`))}
                  className="text-red-500 hover:underline">Delete</button>
              </div>
              {im.file_size ? <div>{kb(im.file_size)}</div> : null}
            </div>
          ))}
        </div>
      )}

      {images.length < MAX_IMAGES && (
        <label className="inline-block text-sm text-gray-600 cursor-pointer border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50">
          {busy ? 'Working…' : 'Upload image'}
          <input type="file" accept="image/jpeg,image/png" className="hidden" disabled={busy}
            onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      )}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}

// Talks to /api/products/:id/variants — add / edit stock / delete size runs.
function ProductVariantManager({ productId, variants: initial }) {
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
      setError(err.response?.data?.error || 'Something went wrong');
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
    <div className="md:col-span-2 border-t border-gray-100 pt-3">
      <p className="text-xs text-gray-500 mb-2">
        Sizes — leave empty for a one-size product. When sizes exist, stock is tracked per size and the
        shopper must pick one.
      </p>

      {variants.length > 0 && (
        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="text-left text-gray-400 text-xs">
              <th className="py-1">Size</th><th className="py-1">SKU</th>
              <th className="py-1 w-28">Stock</th><th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="border-t border-gray-50">
                <td className="py-1 font-medium">{v.label}</td>
                <td className="py-1 text-gray-500">{v.sku || '—'}</td>
                <td className="py-1">
                  <input
                    type="number"
                    min="0"
                    defaultValue={v.stock}
                    disabled={busy}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isInteger(n) && n >= 0 && n !== v.stock) setStock(v, n);
                    }}
                    className="border border-gray-300 rounded px-2 py-1 w-20 text-sm"
                  />
                </td>
                <td className="py-1 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => client.delete(`/products/${productId}/variants/${v.id}`))}
                    className="text-red-500 hover:underline text-xs"
                  >
                    Delete
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
          placeholder="Size"
          value={draft.label}
          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
        />
        <input
          className={`${inputCls} w-40`}
          placeholder="SKU (optional)"
          value={draft.sku}
          onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
        />
        <input
          className={`${inputCls} w-20`}
          type="number"
          min="0"
          placeholder="Stock"
          value={draft.stock}
          onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
        />
        <button
          className="bg-gray-900 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
          disabled={busy}
        >
          Add size
        </button>
      </form>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}

function ProductForm({ categories, initial, onCancel, onSaved }) {
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
      brand: form.brand || null,
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
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-gray-200 rounded-lg p-4 mb-6 grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2 font-medium text-gray-900">
        {editing ? `Edit: ${initial.name}` : 'New product'}
      </div>
      <input className={inputCls} placeholder="Name" value={form.name}
        onChange={(e) => set('name', e.target.value)} required />
      <input className={inputCls} placeholder="SKU (optional)" value={form.sku}
        onChange={(e) => set('sku', e.target.value)} />
      <input className={inputCls} type="number" step="0.01" min="0" placeholder="Price" value={form.price}
        onChange={(e) => set('price', e.target.value)} required />
      <select className={inputCls} value={form.category_id}
        onChange={(e) => set('category_id', e.target.value)}>
        <option value="">No category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input className={inputCls} placeholder="Brand (optional)" value={form.brand || ''}
        onChange={(e) => set('brand', e.target.value)} />
      <select className={inputCls} value={form.gender || ''}
        onChange={(e) => set('gender', e.target.value)}>
        <option value="">Gender —</option>
        <option value="women">Women</option>
        <option value="men">Men</option>
        <option value="unisex">Unisex</option>
      </select>
      {!editing && (
        <input className={inputCls} type="number" min="0" placeholder="Initial stock" value={form.stock ?? ''}
          onChange={(e) => set('stock', e.target.value)} />
      )}
      <input className={inputCls} type="number" min="0" placeholder="Low-stock threshold"
        value={form.low_stock_threshold}
        onChange={(e) => set('low_stock_threshold', e.target.value)} />
      <textarea className={`${inputCls} md:col-span-2`} rows={2} placeholder="Description"
        value={form.description} onChange={(e) => set('description', e.target.value)} />

      {editing ? (
        <>
          <ProductImageManager productId={initial.id} images={initial.images || []} />
          <ProductVariantManager productId={initial.id} variants={initial.variants || []} />
        </>
      ) : (
        <p className="md:col-span-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
          Save the product first, then add its images and sizes.
        </p>
      )}

      {error && <p className="md:col-span-2 text-red-500 text-sm">{error}</p>}
      <div className="md:col-span-2 flex gap-2">
        <button className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
          disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Create product'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md text-sm text-gray-600 hover:underline">
          {editing ? 'Close' : 'Cancel'}
        </button>
      </div>
    </form>
  );
}

function AdjustStock({ product, onDone }) {
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
      setError(err.response?.data?.error || 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-md p-3 text-sm">
      <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="delta">Change by</option>
        <option value="set">Set to</option>
      </select>
      <input className={`${inputCls} w-24`} type="number" step="1" placeholder="0" value={amount}
        onChange={(e) => setAmount(e.target.value)} required />
      <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
        <option value="restock">restock</option>
        <option value="adjustment">adjustment</option>
        <option value="return">return</option>
      </select>
      <input className={`${inputCls} flex-1 min-w-[8rem]`} placeholder="Reason (optional)" value={reason}
        onChange={(e) => setReason(e.target.value)} />
      <button className="bg-gray-900 text-white px-3 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
        disabled={saving}>
        Apply
      </button>
      {error && <span className="text-red-500 w-full">{error}</span>}
    </form>
  );
}

export default function AdminProducts() {
  const { error: toastError } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
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
      .catch((err) => setError(err.response?.data?.error || 'Failed to load products'))
      .finally(() => setLoading(false));
  }, [search, showInactive, lowOnly]);

  useEffect(() => {
    client.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(p) {
    try {
      await client.patch(`/products/${p.id}`, { is_active: !p.is_active });
      load();
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to update');
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
        brand: created.brand || '',
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
    <div className="max-w-5xl mx-auto px-6 py-8">
      <AdminNav />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <button
          onClick={() => setFormFor(formFor === 'new' ? null : 'new')}
          className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
        >
          {formFor === 'new' ? 'Close' : 'New product'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <input className={inputCls} placeholder="Search by name" value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-1.5 text-gray-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
        <label className="flex items-center gap-1.5 text-gray-600">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {formFor === 'new' && (
        <ProductForm categories={categories} initial={{ ...emptyForm, stock: 0 }}
          onCancel={() => setFormFor(null)} onSaved={afterSave} />
      )}
      {/* freshly created product not yet in the loaded list — keep the form up so images can be added */}
      {formFor && formFor.id && !products.some((p) => p.id === formFor.id) && (
        <ProductForm categories={categories} initial={formFor}
          onCancel={() => setFormFor(null)} onSaved={afterSave} />
      )}

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="py-2">Product</th>
              <th className="py-2">Category</th>
              <th className="py-2">Price</th>
              <th className="py-2">Stock</th>
              <th className="py-2">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <Fragment key={p.id}>
                <tr className={`border-b border-gray-100 ${p.is_active ? '' : 'text-gray-400'}`}>
                  <td className="py-2">
                    <div className="font-medium">{p.name}</div>
                    {p.sku && <div className="text-xs text-gray-400">{p.sku}</div>}
                  </td>
                  <td className="py-2">
                    {p.category?.name || '—'}
                    {p.brand && <span className="text-xs text-gray-400"> · {p.brand}</span>}
                    {p.gender && <span className="text-xs text-gray-400"> · {p.gender}</span>}
                  </td>
                  <td className="py-2">${p.price.toFixed(2)}</td>
                  <td className="py-2">
                    <span className={p.low_stock ? 'text-amber-600 font-medium' : ''}>{p.stock}</span>
                    {p.low_stock && <span className="text-xs text-amber-600"> low</span>}
                    {p.has_variants ? (
                      <span className="ml-2 text-xs text-gray-400">per size</span>
                    ) : (
                      <button onClick={() => setAdjustId(adjustId === p.id ? null : p.id)}
                        className="ml-2 text-xs text-gray-500 hover:underline">
                        {adjustId === p.id ? 'close' : 'adjust'}
                      </button>
                    )}
                  </td>
                  <td className="py-2">
                    <button onClick={() => toggleActive(p)}
                      className={p.is_active ? 'text-green-600 hover:underline' : 'text-red-500 hover:underline'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-2 text-right">
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
                                brand: p.brand || '',
                                gender: p.gender || '',
                                low_stock_threshold: p.low_stock_threshold,
                                images: p.images || [],
                                variants: p.variants || [],
                              }
                        )
                      }
                      className="text-gray-600 hover:underline"
                    >
                      Edit
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
                      <ProductForm categories={categories} initial={formFor}
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
