import { Link } from 'react-router-dom';

/* The house lockup: the monkey mark beside the wordmark, "Monkey" in gold —
   the same two-tone wordmark the footer and the presentation site use, now with
   the mark it never had room for.

   The mark ships white-on-transparent and the header runs white type on an ink
   glass in BOTH themes, so one asset serves both. It is `aria-hidden` and the
   link carries the label: a screen reader should hear the house name once, not
   an image description followed by the same words.

   Three sizes, because the header composes differently at each breakpoint
   rather than scaling one lockup down: the tracking tightens as the type
   shrinks, since 0.28em on 10px type is what pushes a 320px header into a
   horizontal scroll. */
const SIZES = {
  sm: {
    mark: 'h-5 w-5',
    gap: 'gap-2',
    /* Centred between a menu button and two actions, the lockup only gets the
       middle third of the bar. Below 360px that third cannot hold the name at
       any legible size, so the mark carries the brand alone — it is the logo,
       and a centred mark reads better than a wordmark crushed into its
       neighbours. The name returns the moment there is room for it. */
    type: 'hidden min-[360px]:inline text-[10px] tracking-[0.12em]',
  },
  md: { mark: 'h-6 w-6', gap: 'gap-2.5', type: 'text-[12px] tracking-[0.18em]' },
  lg: { mark: 'h-7 w-7', gap: 'gap-3', type: 'text-lg tracking-[0.28em]' },
};

export default function BrandLockup({ size = 'lg', onClick, className = '' }) {
  const s = SIZES[size] || SIZES.lg;

  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="Modern Monkey — Home"
      /* No display utility of its own. The header mounts all three cuts and
         shows one per breakpoint; a base `inline-flex` here would sit in the
         same cascade layer as the caller's `hidden` and win by source order,
         leaving every cut visible and the row 300px too wide. The caller owns
         display — see the three lockups in Navbar. */
      className={`group min-w-0 shrink-0 items-center ${s.gap} ${className}`}
    >
      <img
        src="/home/logo-mark-white.png"
        alt=""
        aria-hidden="true"
        width="28"
        height="28"
        /* Explicit box + decoding hint: the mark sits in a fixed header, so a
           late-decoding image must not be able to reflow the row it is in. */
        decoding="async"
        className={`${s.mark} shrink-0 object-contain transition-opacity duration-300 group-hover:opacity-80`}
      />
      <span className={`heading-serif whitespace-nowrap uppercase ${s.type}`}>
        Modern<span className="text-gold"> Monkey</span>
      </span>
    </Link>
  );
}
