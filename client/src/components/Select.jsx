import { Children, isValidElement, useEffect, useRef, useState } from 'react';

/* Custom dropdown — a native <select>'s open popup can't be styled and always
   renders with the OS's own colours, which breaks badly against a dark page.
   Drop-in replacement: same <option> children, same onChange(e) shape (reads
   e.target.value), so existing call sites don't need to change their state
   logic — only the tag name. */
export default function Select({ value, onChange, children, className = '', disabled = false }) {
  const [open, setOpen] = useState(false);
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
  const current = options.find((o) => o.value === currentValue) ?? options[0];

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 border border-line bg-transparent px-3 py-2 text-sm text-ink transition-colors hover:border-champagne focus:outline-none focus:border-champagne disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{current?.label}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 shrink-0 text-stone transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="drop-in absolute z-20 mt-1.5 max-h-60 w-full min-w-max overflow-y-auto border border-line bg-canvas py-1 shadow-xl shadow-black/40"
        >
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === currentValue}
              onClick={() => choose(o.value)}
              className={`cursor-pointer whitespace-nowrap px-3 py-2 text-sm transition-colors ${
                o.value === currentValue ? 'bg-ivory text-champagne' : 'text-ink hover:bg-ivory hover:text-champagne'
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
