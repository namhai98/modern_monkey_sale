import { Fragment, useCallback, useEffect, useState } from 'react';
import client from '../../api/client';
import AdminNav from '../../components/AdminNav';

const inputCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm';
const emptyForm = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  sku: '',
  low_stock_threshold: 0,
  image_url: '',
};

function ProductForm({ categories, initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const editing = Boolean(initial.id);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function upload(file) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const data = new FormData();
      data.append('image', file);
      const res = await client.post('/products/upload', data);
      set('image_url', res.data.url);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

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
      low_stock_threshold: Number(form.low_stock_threshold) || 0,
      image_url: form.image_url || '',
    };
    try {
      if (editing) {
        await client.patch(`/products/${initial.id}`, payload);
      } else {
        await client.post('/products', { ...payload, stock: Number(form.stock) || 0 });
      }
      onSaved();
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
      {!editing && (
        <input className={inputCls} type="number" min="0" placeholder="Initial stock" value={form.stock ?? ''}
          onChange={(e) => set('stock', e.target.value)} />
      )}
      <input className={inputCls} type="number" min="0" placeholder="Low-stock threshold"
        value={form.low_stock_threshold}
        onChange={(e) => set('low_stock_threshold', e.target.value)} />
      <textarea className={`${inputCls} md:col-span-2`} rows={2} placeholder="Description"
        value={form.description} onChange={(e) => set('description', e.target.value)} />
      <div className="md:col-span-2 flex flex-wrap items-center gap-2">
        <input className={`${inputCls} flex-1 min-w-[12rem]`} placeholder="Image URL or upload →"
          value={form.image_url} onChange={(e) => set('image_url', e.target.value)} />
        <label className="text-sm text-gray-600 cursor-pointer border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50">
          {uploading ? 'Uploading...' : 'Upload'}
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {form.image_url && (
          <img src={form.image_url} alt="" className="h-10 w-10 object-cover rounded" />
        )}
      </div>
      {error && <p className="md:col-span-2 text-red-500 text-sm">{error}</p>}
      <div className="md:col-span-2 flex gap-2">
        <button className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
          disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Create product'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md text-sm text-gray-600 hover:underline">
          Cancel
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
      alert(err.response?.data?.error || 'Failed to update');
    }
  }

  function afterSave() {
    setFormFor(null);
    load();
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
                  <td className="py-2">{p.category?.name || '—'}</td>
                  <td className="py-2">${p.price.toFixed(2)}</td>
                  <td className="py-2">
                    <span className={p.low_stock ? 'text-amber-600 font-medium' : ''}>{p.stock}</span>
                    {p.low_stock && <span className="text-xs text-amber-600"> low</span>}
                    <button onClick={() => setAdjustId(adjustId === p.id ? null : p.id)}
                      className="ml-2 text-xs text-gray-500 hover:underline">
                      {adjustId === p.id ? 'close' : 'adjust'}
                    </button>
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
                                low_stock_threshold: p.low_stock_threshold,
                                image_url: p.image_url || '',
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
