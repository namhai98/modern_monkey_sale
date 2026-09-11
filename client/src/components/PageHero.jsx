import Breadcrumb from './Breadcrumb';
import Reveal from './Reveal';
import ImageFallback from './ImageFallback';

/* The unified inner-page hero, same as the presentation site's <PageHero>: a
   fixed-dark band that runs up behind the 80px header, with an optional image
   layer at 50% opacity under a gradient scrim, then breadcrumb → eyebrow →
   serif H1 → lead. Every inner page opens with one so the storefront has the
   same entry rhythm as the marketing site.

   The `-mt-20` cancels the `pt-20` Layout puts on <main> to clear the fixed
   header, so the dark band starts at the very top of the viewport and the
   header's glass sits over it — otherwise the clearance is counted twice and a
   strip of page background shows above the band. The top padding then puts the
   content back below the header.

   `compact` trims that padding for utility pages (account, cart, listing) that
   don't warrant a full cinematic opener. */
export default function PageHero({
  eyebrow,
  title,
  lead,
  image,
  crumbs = [],
  compact = false,
  children,
}) {
  return (
    <section
      className={`relative -mt-20 overflow-hidden bg-ink text-white ${
        compact ? 'pb-10 pt-28 md:pb-16 md:pt-32' : 'pb-14 pt-32 md:pb-24 md:pt-48'
      }`}
    >
      {image && (
        <>
          <ImageFallback
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink"
            aria-hidden="true"
          />
        </>
      )}
      <div className="container-lux relative z-10">
        <Reveal>
          {crumbs.length > 0 && <Breadcrumb items={crumbs} dark />}
          {eyebrow && <p className={`eyebrow ${crumbs.length > 0 ? 'mt-6 md:mt-10' : ''}`}>{eyebrow}</p>}
          <h1
            className={`heading-serif max-w-3xl leading-[1.05] ${
              compact ? 'mt-4 text-3xl md:text-5xl' : 'mt-5 text-4xl md:mt-6 md:text-7xl'
            }`}
          >
            {title}
          </h1>
          {lead && (
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 md:mt-8 md:text-lg">
              {lead}
            </p>
          )}
          {children}
        </Reveal>
      </div>
    </section>
  );
}
