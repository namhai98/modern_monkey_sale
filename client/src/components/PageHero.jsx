import Breadcrumb from './Breadcrumb';
import Reveal from './Reveal';

/* The inner-page header: breadcrumb → eyebrow → serif H1 → lead, sitting in
   normal page flow on the theme's own background. No dark band, no full-bleed
   image — <main>'s own pt-[var(--header-h)] (see Layout.jsx) already clears
   the fixed header, so this needs no margin tricks of its own.

   `compact` trims the type scale for utility pages (account, cart, checkout)
   that don't need as much weight as a section opener like Shop's. */
export default function PageHero({
  eyebrow,
  title,
  lead,
  crumbs = [],
  compact = false,
  children,
}) {
  return (
    <section
      className={`border-b border-line ${
        compact ? 'pb-8 pt-10 md:pb-10 md:pt-14' : 'pb-10 pt-12 md:pb-14 md:pt-16'
      }`}
    >
      <div className="container-lux">
        <Reveal>
          {crumbs.length > 0 && <Breadcrumb items={crumbs} className="mb-6" />}
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1
            className={`heading-serif mt-4 max-w-3xl leading-[1.05] ${
              compact ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl lg:text-6xl'
            }`}
          >
            {title}
          </h1>
          {lead && (
            <p className="mt-6 max-w-xl whitespace-pre-line text-base leading-relaxed text-muted md:text-lg">
              {lead}
            </p>
          )}
          {children}
        </Reveal>
      </div>
    </section>
  );
}
