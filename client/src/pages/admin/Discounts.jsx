import { useCallback, useEffect, useMemo, useState } from 'react';
import client from '../../api/client';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useLocale } from '../../context/LocaleContext';
import {
  AdminPage, Drawer, FormSection, RowAction, SearchInput, Segmented, SelectField, TableWrap,
  TextField, ToggleChip, Toolbar, usd,
} from './kit';
import { btnPrimary, btnGhost, thCls, thNumCls, tdCls, tdNumCls, trCls } from './ui';

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

// Same language as the rest of the admin: gold for live, plain for upcoming,
// muted for over, danger only for switched off.
const STATUS_STYLE = {
  active: 'border-gold/50 text-gold',
  scheduled: 'border-line text-foreground',
  expired: 'border-line text-muted',
  disabled: 'border-danger/50 text-danger',
};

// "2026.09.08" — dots read as a date at a glance; ISO dashes looked like a range.
const fmtDay = (ymdStr) => ymdStr.replaceAll('-', '.');
// Inclusive: a discount from the 8th to the 30th runs 23 days.
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;

const valueLabel = (d) => (d.type === 'percentage' ? `${Number(d.value)}%` : usd(d.value));

/* ── Product multi-select with search ───────────────────────────────────── */

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

  // Resolve names for anything already selected (edit mode).
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
        .get('/products', { params: { ...(term ? { search: term } : {}), limit: 40, include_inactive: 1 } })
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
  const allShownSelected = results.length > 0 && results.every((p) => selectedSet.has(p.id));
  const toggleShown = () => {
    const next = new Set(selectedSet);
    for (const p of results) (allShownSelected ? next.delete(p.id) : next.add(p.id));
    onChange([...next]);
  };

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {selected.map((pid) => (
            <button
              key={pid}
              type="button"
              onClick={() => toggle(pid)}
              className="inline-flex items-center gap-1.5 border border-gold/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:border-danger hover:text-danger"
            >
              {names[pid] || `#${pid}`}
              <Icon name="x" className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-4">
        <SearchInput value={term} onChange={setTerm} placeholder={t('admin.picker.searchPlaceholder')} label={t('admin.picker.search')} className="flex-1" />
        {results.length > 0 && (
          <button type="button" onClick={toggleShown} className="link-lux micro mb-2.5 shrink-0 text-gold">
            {allShownSelected ? t('admin.picker.clearShown') : t('admin.picker.selectShown')}
          </button>
        )}
      </div>

      <div className="mt-3 max-h-72 divide-y divide-line overflow-y-auto border border-line">
        {loading && <p className="p-3 text-sm text-muted">{t('admin.picker.loading')}</p>}
        {!loading && results.length === 0 && <p className="p-3 text-sm text-muted">{t('admin.picker.none')}</p>}
        {!loading &&
          results.map((p) => {
            const on = selectedSet.has(p.id);
            return (
              <label key={p.id} className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-surface ${on ? 'bg-surface' : ''}`}>
                <input type="checkbox" className="accent-[var(--color-gold)]" checked={on} onChange={() => toggle(p.id)} />
                <span className="flex-1 text-foreground">
                  {p.name}
                  {!p.is_active && <span className="text-xs text-muted"> {t('admin.picker.inactive')}</span>}
                </span>
                <span className="text-xs tabular-nums text-muted">{usd(p.price)}</span>
              </label>
            );
          })}
      </div>
    </div>
  );
}

/* ── Create / edit panel ────────────────────────────────────────────────── */

function DiscountDrawer({ initial, onClose, onSaved }) {
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
      setSaving(false);
    }
  }

  return (
    <Drawer
      open
      wide
      title={editing ? initial.name : t('admin.discounts.newTitle')}
      subtitle={t('admin.picker.selected', { n: form.product_ids.length })}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" form="discount-form" className={btnPrimary} disabled={saving}>
            {saving ? t('admin.discounts.saving') : editing ? t('admin.discounts.saveChanges') : t('admin.discounts.create')}
          </button>
          <button type="button" onClick={onClose} className={btnGhost}>{t('admin.discounts.cancel')}</button>
          {error && <p className="w-full text-sm text-danger">{error}</p>}
        </div>
      }
    >
      <form id="discount-form" onSubmit={submit} noValidate>
        <FormSection title={t('admin.discounts.secBasic')}>
          <TextField className="sm:col-span-2" label={t('admin.discounts.colName')} required
            placeholder={t('admin.discounts.namePlaceholder')} value={form.name} onChange={(e) => set('name', e.target.value)} />
          <SelectField label={t('admin.discounts.colType')} value={form.type} onChange={(e) => set('type', e.target.value)}>
            <option value="percentage">{t('admin.discounts.percentage')}</option>
            <option value="fixed">{t('admin.discounts.fixed')}</option>
          </SelectField>
          <TextField
            label={form.type === 'percentage' ? t('admin.discounts.labelPercent') : t('admin.discounts.labelAmount')}
            required type="number" step={form.type === 'percentage' ? '1' : '0.01'} min="0"
            max={form.type === 'percentage' ? '100' : undefined}
            placeholder={form.type === 'percentage' ? t('admin.discounts.percentPlaceholder') : t('admin.discounts.fixedPlaceholder')}
            value={form.value} onChange={(e) => set('value', e.target.value)} />
          <div className="sm:col-span-2">
            <ToggleChip checked={form.is_active} onChange={(v) => set('is_active', v)}>{t('admin.discounts.active')}</ToggleChip>
            <p className="mt-2 text-xs text-muted">{t('admin.discounts.activeHint')}</p>
          </div>
        </FormSection>

        <FormSection title={t('admin.discounts.secDates')} hint={t('admin.discounts.datesHint')}>
          <TextField label={t('admin.discounts.startDate')} type="date" required value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)} />
          <TextField label={t('admin.discounts.endDate')} type="date" required value={form.end_date}
            onChange={(e) => set('end_date', e.target.value)} />
        </FormSection>

        <FormSection title={t('admin.picker.products')} cols={1}>
          <ProductPicker selected={form.product_ids} onChange={(ids) => set('product_ids', ids)} />
        </FormSection>
      </form>
    </Drawer>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function AdminDiscounts() {
  const { t } = useLocale();
  const { error: toastError } = useToast();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formFor, setFormFor] = useState(null); // 'new' | discount-with-product_ids | null
  const [status, setStatus] = useState('all');

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

  useEffect(() => { load(); }, [load]);

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
    if (!confirm(t('admin.discounts.confirmDelete', { name: d.name }))) return;
    try {
      await client.delete(`/discounts/${d.id}`);
      load();
    } catch (err) {
      toastError(err.response?.data?.error || t('admin.discounts.deleteFailed'));
    }
  }

  const shown = status === 'all' ? discounts : discounts.filter((d) => d.status === status);
  const STATUS_OPTIONS = ['all', 'active', 'scheduled', 'expired', 'disabled'];

  return (
    <AdminPage
      title={t('admin.discounts.title')}
      count={t('admin.discounts.count', { n: discounts.length })}
      actions={
        <button onClick={() => setFormFor('new')} className={`${btnPrimary} gap-2`}>
          <Icon name="plus" className="h-3.5 w-3.5" />
          {t('admin.discounts.new')}
        </button>
      }
    >
      {discounts.length > 0 && (
        <Toolbar active={status !== 'all'} onClear={() => setStatus('all')}>
          <Segmented
            label={t('admin.discounts.colStatus')}
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS.map((s) => ({
              value: s,
              label: s === 'all' ? t('admin.ui.all') : t(`admin.discountStatus.${s}`),
            }))}
          />
        </Toolbar>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && discounts.length === 0 && (
        <EmptyState
          inline
          title={t('admin.discounts.none')}
          actions={
            <button onClick={() => setFormFor('new')} className={btnPrimary}>
              {t('admin.discounts.createFirst')}
            </button>
          }
        />
      )}

      {!loading && !error && discounts.length > 0 && shown.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">{t('admin.ui.noMatch')}</p>
      )}

      {!loading && !error && shown.length > 0 && (
        <TableWrap>
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className={trCls}>
                <th className={thCls}>{t('admin.discounts.colName')}</th>
                <th className={`${thCls} w-36`}>{t('admin.discounts.colValue')}</th>
                <th className={`${thCls} w-56`}>{t('admin.discounts.colPeriod')}</th>
                <th className={`${thNumCls} w-24`}>{t('admin.discounts.colProducts')}</th>
                <th className={`${thCls} w-40`}>{t('admin.discounts.colStatus')}</th>
                <th className={`${thNumCls} w-28`}><span className="sr-only">{t('admin.action')}</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.id} className={`${trCls} transition-colors hover:bg-surface`}>
                  <td className={tdCls}>
                    <button type="button" onClick={() => openEdit(d)} className="text-left font-medium text-foreground transition-colors hover:text-gold">
                      {d.name}
                    </button>
                  </td>
                  <td className={tdCls}>
                    <div className="heading-serif text-lg tabular-nums text-foreground">{valueLabel(d)}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {d.type === 'percentage' ? t('admin.discounts.percentage') : t('admin.discounts.fixed')}
                    </div>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap`}>
                    <div className="tabular-nums text-foreground">{fmtDay(d.start_date)} – {fmtDay(d.end_date)}</div>
                    <div className="mt-0.5 text-xs text-muted">{t('admin.discounts.days', { n: daysBetween(d.start_date, d.end_date) })}</div>
                  </td>
                  <td className={`${tdNumCls} text-muted`}>{d.product_count}</td>
                  <td className={tdCls}>
                    <span className={`micro inline-flex border px-2.5 py-1 tracking-meta ${STATUS_STYLE[d.status] || 'border-line text-muted'}`}>
                      {t(`admin.discountStatus.${d.status}`)}
                    </span>
                  </td>
                  <td className={`${tdNumCls} whitespace-nowrap`}>
                    <RowAction icon="edit" label={t('admin.discounts.edit')} onClick={() => openEdit(d)} />
                    <RowAction icon="trash" danger label={t('admin.discounts.delete')} onClick={() => remove(d)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      {formFor && (
        <DiscountDrawer
          key={formFor === 'new' ? 'new' : formFor.id}
          initial={formFor === 'new' ? emptyForm : formFor}
          onClose={() => setFormFor(null)}
          onSaved={() => { setFormFor(null); load(); }}
        />
      )}
    </AdminPage>
  );
}
