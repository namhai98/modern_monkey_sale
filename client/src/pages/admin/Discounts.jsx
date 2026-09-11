import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import { money } from '../../lib/price';
import Select from '../../components/Select';
import Icon from '../../components/Icon';
import { useToast } from '../../context/ToastContext';
import { useLocale } from '../../context/LocaleContext';
import { inputCls, btnPrimary, btnGhost } from './ui';

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
  active: 'text-gold',
  scheduled: 'text-foreground',
  expired: 'text-muted',
  disabled: 'text-danger',
};

function valueLabel(d) {
  return d.type === 'percentage' ? `${Number(d.value)}%` : money(d.value);
}

/* ── product multi-select with search ─────────────────────────── */
function ProductPicker({ selected, onChange }) {
  const { t } = useLocale();
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
    <div className="md:col-span-2 border-t border-line pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted">{t('admin.picker.products')}</p>
        <span className="text-xs text-muted">{t('admin.picker.selected', { n: selected.length })}</span>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((pid) => (
            <button
              key={pid}
              type="button"
              onClick={() => toggle(pid)}
              className="inline-flex items-center gap-1 border border-line text-foreground hover:border-gold px-2 py-0.5 text-xs transition-colors"
            >
              {names[pid] || `#${pid}`}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      <input
        className={`${inputCls} w-full mb-2`}
        placeholder={t('admin.picker.searchPlaceholder')}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <div className="max-h-56 overflow-y-auto border border-line divide-y divide-line/60">
        {loading && <p className="text-sm text-muted p-3">{t('admin.picker.loading')}</p>}
        {!loading && results.length === 0 && (
          <p className="text-sm text-muted p-3">{t('admin.picker.none')}</p>
        )}
        {results.map((p) => (
          <label
            key={p.id}
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-surface"
          >
            <input
              type="checkbox"
              checked={selectedSet.has(p.id)}
              onChange={() => toggle(p.id)}
            />
            <span className="flex-1 text-foreground">
              {p.name}
              {!p.is_active && <span className="text-xs text-muted"> {t('admin.picker.inactive')}</span>}
            </span>
            <span className="text-muted text-xs">{money(p.price)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ── create / edit form ──────────────────────────────────────── */
function DiscountForm({ initial, onCancel, onSaved }) {
  const { t } = useLocale();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(initial.id);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function clientValidate() {
    const v = Number(form.value);
    if (!form.name.trim()) return t('admin.discounts.nameRequired');
    if (!Number.isFinite(v) || v <= 0) return t('admin.discounts.valuePositive');
    if (form.type === 'percentage' && v > 100) return t('admin.discounts.percentMax');
    if (!form.start_date || !form.end_date) return t('admin.discounts.datesRequired');
    if (form.end_date < form.start_date) return t('admin.discounts.endBeforeStart');
    if (form.product_ids.length === 0) return t('admin.discounts.selectProduct');
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
      setError(err.response?.data?.error || t('admin.discounts.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="border border-line bg-surface p-4 mb-6 grid gap-3 md:grid-cols-2"
    >
      <div className="md:col-span-2 heading-serif text-lg text-foreground">
        {editing ? t('admin.discounts.editTitle', { name: initial.name }) : t('admin.discounts.newTitle')}
      </div>

      <input
        className={inputCls}
        placeholder={t('admin.discounts.namePlaceholder')}
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        required
      />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => set('is_active', e.target.checked)}
        />
        {t('admin.discounts.active')}
      </label>

      <Select value={form.type} onChange={(e) => set('type', e.target.value)}>
        <option value="percentage">{t('admin.discounts.percentage')}</option>
        <option value="fixed">{t('admin.discounts.fixed')}</option>
      </Select>
      <input
        className={inputCls}
        type="number"
        step={form.type === 'percentage' ? '1' : '0.01'}
        min="0"
        max={form.type === 'percentage' ? '100' : undefined}
        placeholder={form.type === 'percentage' ? t('admin.discounts.percentPlaceholder') : t('admin.discounts.fixedPlaceholder')}
        value={form.value}
        onChange={(e) => set('value', e.target.value)}
        required
      />

      <label className="text-xs text-muted">
        {t('admin.discounts.startDate')}
        <input
          className={`${inputCls} w-full mt-1`}
          type="date"
          value={form.start_date}
          onChange={(e) => set('start_date', e.target.value)}
          required
        />
      </label>
      <label className="text-xs text-muted">
        {t('admin.discounts.endDate')}
        <input
          className={`${inputCls} w-full mt-1`}
          type="date"
          value={form.end_date}
          onChange={(e) => set('end_date', e.target.value)}
          required
        />
      </label>

      <ProductPicker selected={form.product_ids} onChange={(ids) => set('product_ids', ids)} />

      {error && <p className="md:col-span-2 text-danger text-sm">{error}</p>}
      <div className="md:col-span-2 flex gap-2">
        <button className={btnPrimary} disabled={saving}>
          {saving ? t('admin.discounts.saving') : editing ? t('admin.discounts.saveChanges') : t('admin.discounts.create')}
        </button>
        <button type="button" onClick={onCancel} className={btnGhost}>
          {t('admin.discounts.cancel')}
        </button>
      </div>
    </form>
  );
}

export default function AdminDiscounts() {
  const { t } = useLocale();
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
      .catch((err) => setError(err.response?.data?.error || t('admin.discounts.loadFailed')))
      .finally(() => setLoading(false));
  }, [t]);

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
      toastError(t('admin.discounts.loadOneFailed'));
    }
  }

  async function remove(d) {
    if (!confirm(t('admin.discounts.confirmDelete', { name: d.name }))) {
      return;
    }
    try {
      await client.delete(`/discounts/${d.id}`);
      load();
    } catch (err) {
      toastError(err.response?.data?.error || t('admin.discounts.deleteFailed'));
    }
  }

  function afterSave() {
    setFormFor(null);
    load();
  }

  return (
    <div className="max-w-5xl mx-auto pt-10 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="heading-serif text-2xl text-foreground">{t('admin.discounts.title')}</h1>
        <button
          onClick={() => setFormFor(formFor === 'new' ? null : 'new')}
          className={btnPrimary}
        >
          {formFor === 'new' ? t('admin.discounts.close') : t('admin.discounts.new')}
        </button>
      </div>

      {formFor === 'new' && (
        <DiscountForm initial={emptyForm} onCancel={() => setFormFor(null)} onSaved={afterSave} />
      )}
      {formFor && formFor.id && (
        <DiscountForm initial={formFor} onCancel={() => setFormFor(null)} onSaved={afterSave} />
      )}

      {loading && <p className="text-muted">{t('admin.discounts.loading')}</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && discounts.length === 0 && (
        <div className="text-center text-muted py-16">
          <p>{t('admin.discounts.none')}</p>
          <button onClick={() => setFormFor('new')} className="mt-2 text-foreground hover:text-gold">
            {t('admin.discounts.createFirst')}
          </button>
        </div>
      )}

      {!loading && !error && discounts.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left micro text-muted border-b border-line">
              <th className="py-3 font-normal">{t('admin.discounts.colName')}</th>
              <th className="py-3 font-normal">{t('admin.discounts.colType')}</th>
              <th className="py-3 font-normal">{t('admin.discounts.colValue')}</th>
              <th className="py-3 font-normal">{t('admin.discounts.colStart')}</th>
              <th className="py-3 font-normal">{t('admin.discounts.colEnd')}</th>
              <th className="py-3 font-normal">{t('admin.discounts.colProducts')}</th>
              <th className="py-3 font-normal">{t('admin.discounts.colStatus')}</th>
              <th className="py-3 text-right font-normal">{t('admin.action')}</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((d) => (
              <Fragment key={d.id}>
                <tr className="border-b border-line/60 transition-colors hover:bg-surface">
                  <td className="py-3 font-medium text-foreground">{d.name}</td>
                  <td className="py-3 text-muted">{d.type === 'percentage' ? t('admin.discounts.percentage') : t('admin.discounts.fixed')}</td>
                  <td className="py-3 text-foreground">{valueLabel(d)}</td>
                  <td className="py-3 text-muted">{d.start_date}</td>
                  <td className="py-3 text-muted">{d.end_date}</td>
                  <td className="py-3 text-muted">{d.product_count}</td>
                  <td className={`py-3 capitalize ${STATUS_STYLE[d.status] || 'text-muted'}`}>{t(`admin.discountStatus.${d.status}`)}</td>
                  <td className="py-3 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(d)} className="inline-flex text-muted transition-colors hover:text-gold"
                      aria-label={t('admin.discounts.edit')} title={t('admin.discounts.edit')}>
                      <Icon name="edit" />
                    </button>
                    <button onClick={() => remove(d)} className="inline-flex text-danger transition-opacity duration-300 hover:opacity-70"
                      aria-label={t('admin.discounts.delete')} title={t('admin.discounts.delete')}>
                      <Icon name="trash" />
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
