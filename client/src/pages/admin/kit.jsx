import { useEffect, useId, useState } from 'react';
import Icon from '../../components/Icon';
import Select from '../../components/Select';
import Tooltip from '../../components/Tooltip';
import { useLocale } from '../../context/LocaleContext';
import { inputCls } from './ui';

/* The admin's shared building blocks. Every screen is built from the same few
   parts so they line up and behave alike:

   AdminPage   title + count on the left, the page's main action on the right
   Toolbar     one row of filters under the title, with "clear" when any is set
   Drawer      a side panel for create/edit forms — the table never jumps
   Field*      every input carries a visible label (never placeholder-only)
   RowAction   icon buttons in table rows, each with a hover label

   Same house vocabulary as the storefront: hairlines, gold for "active",
   micro-type labels, square corners. */

// USD amounts in the admin (prices are stored in dollars), with separators.
export function usd(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// A value that settles `ms` after the last change — search-as-you-type without
// a request per keystroke.
export function useDebounced(value, ms = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}

/* ── Page frame ─────────────────────────────────────────────────────────── */

export function AdminPage({ title, count, back, actions, children }) {
  return (
    <div className="pb-8 pt-10">
      {back}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="heading-serif text-3xl text-foreground">{title}</h1>
          {count != null && <p className="micro mt-2 tracking-meta text-muted">{count}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── Filters ────────────────────────────────────────────────────────────── */

export function Toolbar({ children, active = false, onClear }) {
  const { t } = useLocale();
  return (
    <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-5 border-b border-line pb-6">
      {children}
      {active && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="link-lux micro mb-2.5 ml-auto inline-flex items-center gap-1.5 text-gold"
        >
          <Icon name="x" className="h-3 w-3" />
          {t('admin.ui.clearFilters')}
        </button>
      )}
    </div>
  );
}

// A micro label above any control; `htmlFor` ties it to the control.
export function FilterField({ label, htmlFor, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="micro mb-1 block text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, label, className = 'w-full sm:w-72' }) {
  const id = useId();
  const { t } = useLocale();
  return (
    <FilterField label={label || t('admin.ui.search')} htmlFor={id} className={className}>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          id={id}
          type="search"
          className={`${inputCls} pl-6 pr-6`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={t('admin.ui.clearSearch')}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted transition-colors hover:text-gold"
          >
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </FilterField>
  );
}

export function SelectFilter({ label, value, onChange, children, className = 'w-44' }) {
  const id = useId();
  return (
    <FilterField label={label} htmlFor={id} className={className}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </Select>
    </FilterField>
  );
}

export function DateFilter({ label, value, onChange, className = 'w-40' }) {
  const id = useId();
  return (
    <FilterField label={label} htmlFor={id} className={className}>
      <input id={id} type="date" className={`${inputCls}`} value={value} onChange={(e) => onChange(e.target.value)} />
    </FilterField>
  );
}

// A row of mutually exclusive choices (e.g. All / Active) — one click, no menu.
export function Segmented({ label, value, onChange, options }) {
  return (
    <FilterField label={label} className="max-w-full">
      <div role="radiogroup" aria-label={label} className="flex max-w-full overflow-x-auto">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={`micro -ml-px shrink-0 whitespace-nowrap border px-3.5 py-2 tracking-meta transition-colors duration-300 first:ml-0 ${
                on ? 'relative z-10 border-gold text-gold' : 'border-line text-muted hover:text-foreground'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </FilterField>
  );
}

// An on/off filter shown as a chip with a tick, instead of a bare checkbox.
export function ToggleChip({ checked, onChange, children }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`micro mb-0.5 inline-flex items-center gap-2 border px-3.5 py-2 tracking-meta transition-colors duration-300 ${
        checked ? 'border-gold text-gold' : 'border-line text-muted hover:text-foreground'
      }`}
    >
      <span className={`flex h-3.5 w-3.5 items-center justify-center border ${checked ? 'border-gold bg-gold text-ink' : 'border-line'}`}>
        {checked && <Icon name="check" className="h-2.5 w-2.5" strokeWidth={2.5} />}
      </span>
      {children}
    </button>
  );
}

/* ── Forms ──────────────────────────────────────────────────────────────── */

// The side panel lives in components/ so the storefront can use it too.
export { default as Drawer } from '../../components/SidePanel';

// A titled group of fields inside a form.
export function FormSection({ title, hint, children, cols = 2 }) {
  return (
    <section className="border-b border-line pb-8 pt-2 last:border-b-0 [&+&]:pt-8">
      <h3 className="micro tracking-button text-gold">{title}</h3>
      {hint && <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p>}
      <div className={`mt-5 grid gap-x-6 gap-y-6 ${cols === 2 ? 'sm:grid-cols-2' : ''}`}>{children}</div>
    </section>
  );
}

// An input/textarea with its label always visible above it.
export function TextField({ label, hint, as = 'input', className = '', required, ...props }) {
  const id = useId();
  const Tag = as;
  return (
    <div className={className}>
      <label htmlFor={id} className="micro mb-1 block text-muted">
        {label}
        {required && <span className="text-gold"> *</span>}
      </label>
      <Tag id={id} className={inputCls} required={required} {...props} />
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

export function SelectField({ label, hint, value, onChange, children, className = '' }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="micro mb-1 block text-muted">
        {label}
      </label>
      <Select id={id} value={value} onChange={onChange}>
        {children}
      </Select>
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

/* ── Tables ─────────────────────────────────────────────────────────────── */

// Horizontal scroll on narrow screens instead of crushing the columns.
// `relative` makes it the containing block, so absolutely positioned bits in
// the table (sr-only labels, tooltips) are clipped too instead of widening the page.
export function TableWrap({ children }) {
  return <div className="relative -mx-1 overflow-x-auto px-1">{children}</div>;
}

export function RowAction({ icon, label, onClick, danger = false, disabled = false }) {
  return (
    <Tooltip label={label} align="end">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`inline-flex h-9 w-9 items-center justify-center transition-colors duration-300 disabled:opacity-40 ${
          danger ? 'text-danger hover:opacity-70' : 'text-muted hover:text-gold'
        }`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </button>
    </Tooltip>
  );
}

// A small status label: gold when live, hairline/muted otherwise.
export function StatusPill({ on, children }) {
  return (
    <span
      className={`micro inline-flex items-center gap-1.5 border px-2.5 py-1 tracking-meta ${
        on ? 'border-gold/50 text-gold' : 'border-line text-muted'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-gold' : 'bg-muted/60'}`} />
      {children}
    </span>
  );
}
