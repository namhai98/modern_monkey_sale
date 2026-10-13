import { Children, useEffect, useId, useState } from 'react';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import Field from '../../components/Field';
import StatusBadge from '../../components/StatusBadge';
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

/* A failed load, said plainly with a way to try again — never a bare red
   line the admin has to reload the page to get past. */
export function LoadError({ message, onRetry }) {
  const { t } = useLocale();
  return (
    <EmptyState
      inline
      title={message}
      actions={
        onRetry && (
          <Button variant="outline-dark" size="xs" onClick={onRetry}>
            {t('admin.ui.retry')}
          </Button>
        )
      }
    />
  );
}

/* ── Filters ────────────────────────────────────────────────────────────── */

/* On a phone the filters fold away behind one button so the list starts in
   the first screen; a leading SearchInput stays out, since searching is the
   common case. From md the row is unchanged (`md:contents` lets the folded
   group's children sit in the row as before). */
export function Toolbar({ children, active = false, onClear }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const list = Children.toArray(children);
  const primary = list[0]?.type === SearchInput ? list[0] : null;
  const rest = primary ? list.slice(1) : list;
  return (
    <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-5 border-b border-line pb-6">
      {primary}
      {rest.length > 0 && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="micro inline-flex items-center gap-2 border border-line px-3.5 py-2.5 tracking-meta text-muted transition-colors duration-300 hover:text-foreground md:hidden"
        >
          <Icon name="filter" className="h-3.5 w-3.5" />
          {t('admin.ui.filters')}
          {active && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />}
          <Icon name="chevronDown" className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      {rest.length > 0 && (
        <div className={`${open ? 'flex' : 'hidden'} w-full flex-wrap items-end gap-x-6 gap-y-5 md:contents`}>{rest}</div>
      )}
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
      <span className={`flex h-3.5 w-3.5 items-center justify-center border ${checked ? 'border-gold-fill bg-gold-fill text-ink' : 'border-line'}`}>
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
// The storefront's Field, so labels, hints, the required marker and errors
// look and behave the same in the shop and the admin.
export function TextField(props) {
  return <Field {...props} />;
}

export function SelectField({ label, hint, value, onChange, children, className = '' }) {
  return (
    <Field
      label={label}
      hint={hint}
      className={className}
      control={
        <Select value={value} onChange={onChange}>
          {children}
        </Select>
      }
    />
  );
}

/* ── Tables ─────────────────────────────────────────────────────────────── */

// Horizontal scroll on narrow screens instead of crushing the columns.
// `relative` makes it the containing block, so absolutely positioned bits in
// the table (sr-only labels, tooltips) are clipped too instead of widening the page.
// `stickyFirst`: the first column (the order or product name) stays put while
// a wide table scrolls sideways on a phone, so a row never loses what it is.
export function TableWrap({ children, stickyFirst = false }) {
  return (
    <div
      className={`relative -mx-1 overflow-x-auto px-1 ${
        stickyFirst
          ? '[&_tr>*:first-child]:sticky [&_tr>*:first-child]:left-0 [&_tr>*:first-child]:z-10 [&_tr>*:first-child]:bg-background max-md:[&_tr>*:first-child]:border-r max-md:[&_tr>*:first-child]:border-line'
          : ''
      }`}
    >
      {children}
    </div>
  );
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
/* A status you can flip in place (product shown/hidden, user enabled/
   disabled): the pill shows the state, the tooltip and accessible name say
   what a click will do. */
export function StatusToggle({ on, onClick, action, children }) {
  return (
    <Tooltip label={action}>
      <button type="button" onClick={onClick} aria-label={action} className="inline-flex">
        <StatusPill on={on}>{children}</StatusPill>
      </button>
    </Tooltip>
  );
}

export function StatusPill({ on, children }) {
  return (
    <StatusBadge tone={on ? 'active' : 'closed'} dot>
      {children}
    </StatusBadge>
  );
}
