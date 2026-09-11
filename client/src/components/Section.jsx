/* The presentation site's one section shape:

     <section class="py-14 md:py-24 lg:py-36"><div class="container-lux"> … </div></section>

   Keeping the 14 / 24 / 36 vertical scale and the single container is what
   gives both sites the same breathing room. `tone="dark"` renders a fixed-dark
   band (bg-ink, white text in both themes) — the alternating band rhythm the
   home page is built on.

   Never nest one Section inside another: sections own their vertical padding. */

const PAD = {
  // Standard section.
  default: 'py-14 md:py-24 lg:py-36',
  // Inner-page content sections sit slightly tighter.
  content: 'py-14 md:py-24 lg:py-32',
  // For a section that only needs to clear the one below it.
  tight: 'py-12 md:py-16',
  none: '',
};

export default function Section({
  tone = 'theme',
  pad = 'default',
  className = '',
  containerClassName = '',
  children,
  as: Tag = 'section',
  ...props
}) {
  const toneCls = tone === 'dark' ? 'bg-ink text-white' : tone === 'surface' ? 'bg-surface' : '';

  return (
    <Tag className={[toneCls, PAD[pad], className].filter(Boolean).join(' ')} {...props}>
      <div className={`container-lux ${containerClassName}`}>{children}</div>
    </Tag>
  );
}

/* The same container without the section padding — for the handful of places
   that need the gutter and max-width but manage their own vertical space. */
export function Container({ className = '', children, as: Tag = 'div', ...props }) {
  return (
    <Tag className={`container-lux ${className}`} {...props}>
      {children}
    </Tag>
  );
}
