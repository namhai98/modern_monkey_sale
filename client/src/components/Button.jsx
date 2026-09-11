import { Link } from 'react-router-dom';

/* The house button, matching the presentation site's components/ui/button.tsx:
   sharp corners, no radius, no shadow, ~11px uppercase label at 0.32em, and —
   on the primary variant — a champagne layer that sweeps in from the left over
   500ms on hover.

   Pick the outline variant by surface: `outline` on a fixed-dark band (bg-ink),
   `outline-dark` on a theme surface. Never restyle a button at the call site;
   add a variant here instead. */

const base =
  'group relative inline-flex items-center justify-center gap-3 overflow-hidden whitespace-nowrap ' +
  'micro font-medium tracking-[0.32em] select-none ' +
  'transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const variants = {
  // Primary CTA everywhere — gold ground, champagne sweep on hover.
  gold: 'bg-gold text-ink',
  // Secondary, on a fixed-dark band.
  outline: 'border border-white/40 text-white hover:border-gold hover:text-gold',
  // Secondary, on a theme surface.
  'outline-dark': 'border border-line text-foreground hover:border-gold hover:text-gold',
};

// The variant names this component shipped with before it adopted the
// presentation site's vocabulary. Kept so a call site can't silently fall
// through to an undefined class string.
const ALIASES = { primary: 'gold', secondary: 'outline-dark', onDark: 'outline' };

const sizes = {
  sm: 'px-6 py-2.5',
  md: 'px-9 py-4',
  lg: 'px-10 py-[1.15rem]',
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
  const cls = [base, variants[key] || variants.gold, sizes[size], full ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ');

  // The sweep sits under a `relative z-10` label so the text stays readable
  // as the champagne layer slides across beneath it.
  const inner = (
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
