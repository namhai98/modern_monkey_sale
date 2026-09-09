import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import AdminNav from '../../components/AdminNav';
import { money } from '../../lib/price';
import { useToast } from '../../context/ToastContext';

const inputCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm';
const ymd = (d) => d.toISOString().slice(0, 10);
const today = () => ymd(new Date());
const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return ymd(d);
};

const emptyForm = {
  name: '',
  type: 'percentage',
  value: '',
  start_date: today(),
  end_date: plusDays(14),
  is_active: true,
  product_ids: [],
};

const STATUS_STYLE = {
  active: 'text-green-600',
  scheduled: 'text-blue-600',
  expired: 'text-gray-400',
  disabled: 'text-red-500',
};

function valueLabel(d) {
  return d.type === 'percentage' ? `${Number(d.value)}%` : money(d.value);
}

/* ── product multi-select with search ─────────────────────────── */
function ProductPicker({ selected, onChange }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState({}); // id -> name, so chips survive searches

  const remember = useCallback((list) => {
    setNames((prev) => {
      const next = { ...prev };
      for (const p of list) next[p.id] = p.name;
      return next;
    });
  }, []);

  // resolve names for anything already selected (edit mode)
  useEffect(() => {
    const missing = selected.filter((id) => !names[id]);
    if (missing.length === 0) return;
    client
      .get('/products', { params: { ids: missing.join(','), limit: missing.length } })
      .then((res) => remember(res.data.items))
      .catch(() => {});
  }, [selected, names, remember]);

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => {
      client
        .get('/products', {
          params: { ...(term ? { search: term } : {}), limit: 40, include_inactive: 1 },
        })
        .then((res) => {
          setResults(res.data.items);
          remember(res.data.items);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(id);
  }, [term, remember]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const toggle = (pid) => {
    const next = new Set(selectedSet);
    if (next.has(pid)) next.delete(pid);
    else next.add(pid);
    onChange([...next]);
  };

  return (
    <div className="md:col-span-2 border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">Products</p>
        <span className="text-xs text-gray-500">Selected: {selected.length}</span>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((pid) => (
            <button
              key={pid}
              type="button"
              onClick={() => toggle(pid)}
              className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 rounded px-2 py-0.5 text-xs"
            >
              {names[pid] || `#${pid}`}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      <input
        className={`${inputCls} w-full mb-2`}
        placeholder="Search products..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-50">
        {loading && <p className="text-sm text-gray-400 p-3">Loading…</p>}
        {!loading && results.length === 0 && (
          <p className="text-sm text-gray-400 p-3">No products found</p>
        )}
        {results.map((p) => (
          <label
            key={p.id}
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selectedSet.has(p.id)}
              onChange={() => toggle(p.id)}
            />
            <span className="flex-1">
              {p.name}
              {!p.is_active && <span className="text-xs text-gray-400"> (inactive)</span>}
            </span>
            <span className="text-gray-400 text-xs">{money(p.price)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ── create / edit form ──────────────────────────────────────── */
function DiscountForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(initial.id);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function clientValidate() {
    const v = Number(form.value);
    if (!form.name.trim()) return 'Name is required.';
    if (!Number.isFinite(v) || v <= 0) return 'Value must be greater than 0.';
    if (form.type === 'percentage' && v > 100) return 'Percentage cannot exceed 100.';
    if (!form.start_date || !form.end_date) return 'Start and end dates are required.';
    if (form.end_date < form.start_date) return 'End date cannot be before start date.';
    if (form.product_ids.length === 0) return 'Select at least one product.';
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    const problem = clientValidate();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      value: Number(form.value),
      start_date: form.start_date,
      end_date: form.end_date,
      is_active: Boolean(form.is_active),
      product_ids: form.product_ids,
    };
    try {
      if (editing) await client.patch(`/discounts/${initial.id}`, payload);
      else await client.post('/discounts', payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="border border-gray-200 rounded-lg p-4 mb-6 grid gap-3 md:grid-cols-2"
    >
      <div className="md:col-span-2 font-medium text-gray-900">
        {editing ? `Edit: ${initial.name}` : 'New discount'}
      </div>

      <input
        className={inputCls}
        placeholder="Discount name"
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        required
      />
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => set('is_active', e.target.checked)}
        />
        Active
      </label>

      <select className={inputCls} value={form.type} onChange={(e) => set('type', e.target.value)}>
        <option value="percentage">Percentage (%)</option>
        <option value="fixed">Fixed amount ($)</option>
      </select>
      <input
        className={inputCls}
        type="number"
        step={form.type === 'percentage' ? '1' : '0.01'}
        min="0"
        max={form.type === 'percentage' ? '100' : undefined}
        placeholder={form.type === 'percentage' ? 'e.g. 20' : 'e.g. 50.00'}
        value={form.value}
        onChange={(e) => set('value', e.target.value)}
        required
      />

      <label className="text-xs text-gray-500">
        Start date
        <input
          className={`${inputCls} w-full mt-1`}
          type="date"
          value={form.start_date}
          onChange={(e) => set('start_date', e.target.value)}
          required
        />
      </label>
      <label className="text-xs text-gray-500">
        End date
        <input
          className={`${inputCls} w-full mt-1`}
          type="date"
          value={form.end_date}
          onChange={(e) => set('end_date', e.target.value)}
          required
        />
      </label>

      <ProductPicker selected={form.product_ids} onChange={(ids) => set('product_ids', ids)} />

      {error && <p className="md:col-span-2 text-red-500 text-sm">{error}</p>}
      <div className="md:col-span-2 flex gap-2">
        <button
          className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Create discount'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md text-sm text-gray-600 hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminDiscounts() {
  const { error: toastError } = useToast();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formFor, setFormFor] = useState(null); // 'new' | discount-with-product_ids | null

  const load = useCallback(() => {
    setLoading(true);
    client
      .get('/discounts')
      .then((res) => {
        setDiscounts(res.data);
        setError(null);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load discounts'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openEdit(d) {
    try {
      const res = await client.get(`/discounts/${d.id}`);
      setFormFor({
        id: res.data.id,
        name: res.data.name,
        type: res.data.type,
        value: String(res.data.value),
        start_date: res.data.start_date,
        end_date: res.data.end_date,
        is_active: res.data.is_active,
        product_ids: res.data.product_ids || [],
      });
    } catch {
      toastError('Could not load that discount');
    }
  }

  async function remove(d) {
    if (!confirm(`Delete "${d.name}"?\n\nThis discount will no longer apply to its products. The products are not deleted.`)) {
      return;
    }
    try {
      await client.delete(`/discounts/${d.id}`);
      load();
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to delete');
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
        <h1 className="text-2xl font-semibold text-gray-900">Discounts</h1>
        <button
          onClick={() => setFormFor(formFor === 'new' ? null : 'new')}
          className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
        >
          {formFor === 'new' ? 'Close' : 'New discount'}
        </button>
      </div>

      {formFor === 'new' && (
        <DiscountForm initial={emptyForm} onCancel={() => setFormFor(null)} onSaved={afterSave} />
      )}
      {formFor && formFor.id && (
        <DiscountForm initial={formFor} onCancel={() => setFormFor(null)} onSaved={afterSave} />
      )}

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && discounts.length === 0 && (
        <div className="text-center text-gray-500 py-16">
          <p>No discounts yet</p>
          <button onClick={() => setFormFor('new')} className="mt-2 text-gray-900 hover:underline">
            Create your first discount
          </button>
        </div>
      )}

      {!loading && !error && discounts.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="py-2">Name</th>
              <th className="py-2">Type</th>
              <th className="py-2">Value</th>
              <th className="py-2">Start</th>
              <th className="py-2">End</th>
              <th className="py-2">Products</th>
              <th className="py-2">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((d) => (
              <Fragment key={d.id}>
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-medium">{d.name}</td>
                  <td className="py-2 capitalize">{d.type}</td>
                  <td className="py-2">{valueLabel(d)}</td>
                  <td className="py-2 text-gray-500">{d.start_date}</td>
                  <td className="py-2 text-gray-500">{d.end_date}</td>
                  <td className="py-2">{d.product_count}</td>
                  <td className={`py-2 capitalize ${STATUS_STYLE[d.status] || ''}`}>{d.status}</td>
                  <td className="py-2 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(d)} className="text-gray-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => remove(d)} className="text-red-500 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
