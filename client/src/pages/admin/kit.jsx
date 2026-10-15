import { Children, useEffect, useId, useRef, useState } from 'react';
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

/* What sits under an element inside <main>: the siblings after it (a pager)
   and every ancestor's bottom padding, so the region can leave exactly that
   much room. Floating layers (toasts, drawers) are not in the flow and don't
   count. */
function spaceBelow(el) {
  let total = 0;
  for (let node = el; node && node.parentElement && node.tagName !== 'MAIN'; node = node.parentElement) {
    for (let sib = node.nextElementSibling; sib; sib = sib.nextElementSibling) {
      const cs = getComputedStyle(sib);
      if (cs.position === 'fixed' || cs.position === 'absolute' || cs.display === 'none') continue;
      total += sib.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
    }
    const ps = getComputedStyle(node.parentElement);
    total += parseFloat(ps.paddingBottom) + parseFloat(ps.borderBottomWidth);
  }
  return total;
}

/* Lets a scrolling region end at the bottom of the window, so a page that
   holds a long list still fits one screen: the list scrolls inside itself and
   the title, filters and pager stay put. Whatever follows it is measured and
   left room for; `gap` adds a little air. From md up only — a phone scrolls
   the page as usual. Re-measured on resize and whenever `deps` change. */
export function useFillHeight(gap = 0, deps = []) {
  const ref = useRef(null);
  useEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      if (window.innerWidth < 768) {
        el.style.maxHeight = '';
        return;
      }
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.maxHeight = `${Math.max(200, window.innerHeight - top - spaceBelow(el) - gap)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gap, ...deps]);
  return ref;
}

// `dense`: tighter spacing for a screen that should fit one window.
export function AdminPage({ title, count, back, actions, dense = false, children }) {
  return (
    <div className="pb-2">
      {back}
      <div className={`flex flex-wrap items-end justify-between gap-4 ${dense ? 'mb-4' : 'mb-6'}`}>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
          {count != null && <p className="mt-1 text-sm text-muted">{count}</p>}
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
export function Toolbar({ children, active = false, onClear, dense = false }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const list = Children.toArray(children);
  const primary = list[0]?.type === SearchInput ? list[0] : null;
  const rest = primary ? list.slice(1) : list;
  return (
    <div className={`flex flex-wrap items-end gap-x-4 gap-y-3 ${dense ? 'mb-4' : 'mb-5'}`}>
      {primary}
      {rest.length > 0 && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-admin-field-border bg-surface px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-admin-hover md:hidden"
        >
          <Icon name="filter" className="h-3.5 w-3.5" />
          {t('admin.ui.filters')}
          {active && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />}
          <Icon name="chevronDown" className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      {rest.length > 0 && (
        <div className={`${open ? 'flex' : 'hidden'} w-full flex-wrap items-end gap-x-4 gap-y-3 md:contents`}>{rest}</div>
      )}
      {active && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mb-2 ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gold transition-colors hover:bg-admin-hover"
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
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted">
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
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          id={id}
          type="search"
          className={`${inputCls} pl-9! pr-8!`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={t('admin.ui.clearSearch')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:text-foreground"
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
      <div role="radiogroup" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-lg border border-admin-field-border shadow-xs">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={`shrink-0 whitespace-nowrap border-l border-admin-field-border px-3.5 py-2 text-sm font-medium transition-colors first:border-l-0 ${
                on ? 'bg-admin-hover text-gold' : 'bg-surface text-foreground hover:bg-admin-hover'
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
      className={`mb-0.5 inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
        checked ? 'border-gold bg-gold-fill/10 text-gold' : 'border-admin-field-border bg-surface text-foreground hover:bg-admin-hover'
      }`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? 'border-gold-fill bg-gold-fill text-ink' : 'border-admin-field-border bg-admin-field'}`}>
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
    <section className="border-b border-line pb-6 pt-1 last:border-b-0 [&+&]:pt-6">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {hint && <p className="mt-1 text-sm leading-relaxed text-muted">{hint}</p>}
      <div className={`mt-4 grid gap-x-4 gap-y-4 ${cols === 2 ? 'sm:grid-cols-2' : ''}`}>{children}</div>
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
export function TableWrap({ children, stickyFirst = false, plain = false }) {
  return (
    <div
      className={`${plain ? '-mx-4 -mb-4 border-t border-line sm:-mx-6 sm:-mb-6' : 'admin-card'} relative overflow-x-auto [&_thead]:bg-admin-thead [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-admin-hover ${
        stickyFirst
          ? '[&_tbody_tr>*:first-child]:sticky [&_tbody_tr>*:first-child]:left-0 [&_tbody_tr>*:first-child]:z-10 [&_tbody_tr>*:first-child]:bg-surface [&_thead_tr>*:first-child]:sticky [&_thead_tr>*:first-child]:left-0 [&_thead_tr>*:first-child]:z-10 [&_thead_tr>*:first-child]:bg-admin-thead max-md:[&_tr>*:first-child]:border-r max-md:[&_tr>*:first-child]:border-line'
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
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
          danger ? 'text-danger hover:bg-danger/10' : 'text-muted hover:bg-admin-hover hover:text-foreground'
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
