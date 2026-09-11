/* One quantity control for the bag, the drawer and the product page — all three
   had their own hand-rolled version with different padding and hit areas.

   Square-cornered and hairline-bordered like every other control, with the
   border turning gold on hover so it answers to the same signal as the rest of
   the system. */

const SIZES = {
  sm: { btn: 'h-8 w-8 text-sm', val: 'w-8 text-sm' },
  md: { btn: 'h-12 w-12 text-base', val: 'w-10 text-sm' },
};

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = Infinity,
  size = 'md',
  labels = { decrease: 'Decrease quantity', increase: 'Increase quantity' },
  className = '',
}) {
  const s = SIZES[size] || SIZES.md;
  const btn =
    `inline-flex items-center justify-center text-muted transition-colors duration-300 ` +
    `hover:text-gold disabled:opacity-30 disabled:hover:text-muted ${s.btn}`;

  return (
    <span
      className={`inline-flex items-center border border-line transition-colors duration-300 hover:border-gold/50 ${className}`}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={labels.decrease}
      >
        −
      </button>
      <span className={`text-center tabular-nums text-foreground ${s.val}`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={labels.increase}
      >
        +
      </button>
    </span>
  );
}
