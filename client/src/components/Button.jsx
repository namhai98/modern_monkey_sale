import { Link } from 'react-router-dom';
import { useSkin } from '../context/SkinContext';

/* The house button, matching the presentation site's components/ui/button.tsx:
   sharp corners, no radius, no shadow, ~11px uppercase label at 0.32em, and —
   on the primary variant — a champagne layer that sweeps in from the left over
   500ms on hover.

   Pick the outline variant by surface: `outline` on a fixed-dark band (bg-ink),
   `outline-dark` on a theme surface. Never restyle a button at the call site;
   add a variant here instead. */

// Phones may wrap a label onto a second, balanced line rather than clip it —
// Mongolian CTAs run about twice the length of their English originals, and
// at 0.32em tracking several overflowed a 375px screen. From `sm` up there is
// room, so the single-line treatment returns.
const base =
  'group relative inline-flex items-center justify-center gap-3 overflow-hidden ' +
  'whitespace-normal text-balance text-center sm:whitespace-nowrap ' +
  'micro font-medium select-none ' +
  'transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ' +
  'disabled:pointer-events-none disabled:cursor-not-allowed';

const variants = {
  // Primary CTA everywhere — gold ground, champagne sweep on hover. Disabled,
  // it does NOT fade: a half-transparent gold left its dark label at ~3:1, and
  // a disabled CTA often carries an instruction ("Choose a size") that has to
  // be read. It drops to a quiet panel with a hairline and muted text instead.
  gold: 'bg-gold-fill text-ink disabled:border disabled:border-line disabled:bg-surface disabled:text-muted',
  // Secondary, on a fixed-dark band.
  outline: 'border border-white/40 text-white hover:border-gold hover:text-gold disabled:opacity-50',
  // Secondary, on a theme surface.
  'outline-dark': 'border border-line text-foreground hover:border-gold hover:text-gold disabled:opacity-50',
  // Irreversible actions (delete, disable, cancel an order): the one place the
  // danger token fills a button.
  danger: 'border border-danger bg-danger text-white hover:opacity-90 disabled:opacity-50',
};

// The variant names this component shipped with before it adopted the
// presentation site's vocabulary. Kept so a call site can't silently fall
// through to an undefined class string.
const ALIASES = { primary: 'gold', secondary: 'outline-dark', onDark: 'outline' };

const sizes = {
  // Compact, for admin toolbars and table actions: 36px tall, the meta tracking
  // step instead of the button rung so a row of them stays narrow.
  xs: 'px-4 py-2 tracking-meta',
  sm: 'px-6 py-2.5 tracking-button',
  md: 'px-6 py-4 tracking-button sm:px-9',
  lg: 'px-7 py-[1.15rem] tracking-button sm:px-10',
};

/* The admin skin (Flowbite): rounded-lg, sentence-case medium text, a soft
   focus ring, no champagne sweep. Same variant and size names, so admin call
   sites don't change. */
const ADMIN_BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium select-none ' +
  'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30 ' +
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50';
const ADMIN_VARIANTS = {
  gold: 'bg-gold-fill text-ink hover:bg-[#b8933f]',
  outline: 'border border-admin-field-border bg-surface text-foreground hover:bg-admin-hover',
  'outline-dark': 'border border-admin-field-border bg-surface text-foreground hover:bg-admin-hover',
  danger: 'bg-danger text-white hover:opacity-90',
};
const ADMIN_SIZES = {
  xs: 'px-3 py-2 text-xs',
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
};

export default function Button({
  to,
  href,
  as,
  variant = 'gold',
  size = 'md',
  full = false,
  className = '',
  children,
  ...props
}) {
  const key = ALIASES[variant] || variant;
  const admin = useSkin() === 'admin';
  const cls = (
    admin
      ? [ADMIN_BASE, ADMIN_VARIANTS[key] || ADMIN_VARIANTS.gold, ADMIN_SIZES[size] || ADMIN_SIZES.md]
      : [base, variants[key] || variants.gold, sizes[size]]
  )
    .concat(full ? 'w-full' : '', className)
    .filter(Boolean)
    .join(' ');

  // The sweep sits under a `relative z-10` label so the text stays readable
  // as the champagne layer slides across beneath it.
  const inner = admin ? (
    children
  ) : (
    <>
      {key === 'gold' && (
        <span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-champagne transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-3">{children}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} {...props}>
        {inner}
      </a>
    );
  }
  const Tag = as || 'button';
  return (
    <Tag className={cls} {...props}>
      {inner}
    </Tag>
  );
}
