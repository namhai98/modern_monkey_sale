import { Children, isValidElement, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useSkin } from '../context/SkinContext';

/* Custom dropdown — a native <select>'s open popup can't be styled and always
   renders with the OS's own colours, which breaks badly against a dark page.
   Drop-in replacement: same <option> children, same onChange(e) shape (reads
   e.target.value), so existing call sites don't need to change their state
   logic — only the tag name. */
export default function Select({
  value,
  onChange,
  children,
  className = '',
  disabled = false,
  // `bare`: no underline and no padding — for a select sitting inline in a
  // row that already has its own rule (the shop's count/sort header).
  bare = false,
  id,
  // Shown, muted, while the value matches no option ("Choose…").
  placeholder,
  invalid = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}) {
  const [open, setOpen] = useState(false);
  // The admin's select is a boxed Flowbite field with a rounded dropdown.
  const admin = useSkin() === 'admin' && !bare;
  const ref = useRef(null);

  // A native <select> always stringifies both an <option value={...}> and the
  // value it reports back on change, even when given a number — so this must
  // too, or a numeric id (option value={5}) never matches a string form value
  // ("5") and the dropdown silently falls back to its first option.
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((el) => ({ value: String(el.props.value ?? ''), label: el.props.children }));

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function choose(v) {
    onChange({ target: { value: v } });
    setOpen(false);
  }

  const currentValue = String(value ?? '');
  const current = options.find((o) => o.value === currentValue) ?? (placeholder ? null : options[0]);

  // Arrow keys step through the options without opening the list, as a
  // native select does.
  function onKeyDown(e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    if (!options.length) return;
    const i = options.findIndex((o) => o.value === currentValue);
    const next = e.key === 'ArrowDown' ? Math.min(options.length - 1, i + 1) : Math.max(0, i - 1);
    if (next !== i) onChange({ target: { value: options[next].value } });
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={ariaDescribedBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        /* A named select also says what it is set to ("Sort: Newest"), so the
           name contains the visible text a voice-control user would say. */
        aria-label={ariaLabel && typeof current?.label === 'string' ? `${ariaLabel}: ${current.label}` : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        /* Underline-only, like every other field in the house style — the
           presentation site applies the same treatment to its <select>s. */
        className={
          admin
            ? 'admin-field flex items-center justify-between gap-3 text-left aria-expanded:border-gold aria-expanded:shadow-[0_0_0_1px_var(--gold)]'
            : `flex w-full items-center justify-between gap-3 bg-transparent text-left text-sm text-foreground transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                bare
                  ? 'py-1 hover:text-gold aria-expanded:text-gold'
                  : `border-b py-3 hover:border-gold aria-expanded:border-gold ${invalid ? 'border-danger' : 'border-line'}`
              }`
        }
      >
        <span className={`truncate ${current ? '' : 'text-muted'}`}>{current ? current.label : placeholder}</span>
        <Icon
          name="chevronDown"
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${
            open ? 'rotate-180 text-gold' : 'text-muted'
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          /* A floating layer is held by a border and a blur rather than a drop
             shadow — the house rule for elevation. */
          className={
            admin
              ? 'drop-in absolute z-30 mt-1 max-h-60 w-full min-w-max overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-lg'
              : `drop-in absolute z-30 max-h-60 w-full min-w-max overflow-y-auto border border-line bg-background/95 py-2 backdrop-blur-xl ${
                  bare ? 'right-0 mt-3' : 'mt-1'
                }`
          }
        >
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === currentValue}
              onClick={() => choose(o.value)}
              className={
                admin
                  ? `cursor-pointer whitespace-nowrap px-3 py-2 text-sm transition-colors duration-150 hover:bg-admin-hover ${
                      o.value === currentValue ? 'font-medium text-gold' : 'text-foreground'
                    }`
                  : `cursor-pointer whitespace-nowrap px-4 py-2 text-sm transition-colors duration-300 ${
                      o.value === currentValue ? 'text-gold' : 'text-foreground hover:text-gold'
                    }`
              }
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
