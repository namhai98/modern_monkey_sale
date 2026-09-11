/* The one round control in the design system. Radius is 0 everywhere else — it
   is reserved for 36–48px icon-only buttons (close, prev/next, social), exactly
   as on the presentation site, which had this same shape duplicated four times
   with slightly different borders. This is the single version.

   Icon-only means an aria-label is mandatory at the call site. */

const TONES = {
  // On a fixed-dark band or an overlay.
  dark: 'border-white/20 text-white hover:border-gold hover:text-gold',
  // On a theme surface.
  theme: 'border-line text-foreground hover:border-gold hover:text-gold',
  // Floating above the page — the only place a shadow is allowed.
  floating:
    'border-gold/40 bg-ink/90 text-gold backdrop-blur shadow-lg shadow-black/30 hover:bg-gold hover:text-ink hover:scale-110',
};

const SIZES = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
};

export default function IconButton({
  tone = 'theme',
  size = 'md',
  as,
  className = '',
  children,
  ...props
}) {
  const Tag = as || 'button';
  return (
    <Tag
      className={[
        'inline-flex shrink-0 touch-manipulation items-center justify-center rounded-full border',
        'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        'disabled:opacity-40 disabled:pointer-events-none',
        TONES[tone],
        SIZES[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Tag>
  );
}
