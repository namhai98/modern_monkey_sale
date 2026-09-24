/* The presentation site runs every full-page state — 404, error, loading —
   through one skeleton: a fixed-dark, centred column of
   eyebrow → serif headline → max-w-md body → button pair. Reusing it here means
   an empty search, an empty bag and a missing product all read as the same
   house voice instead of three ad-hoc paragraphs.

   `inline` drops the dark band and the viewport height for the states that sit
   inside an existing surface (the bag drawer, a product grid). */
export default function EmptyState({
  eyebrow,
  title,
  body,
  actions,
  inline = false,
  className = '',
}) {
  if (inline) {
    return (
      <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {title && <p className="heading-serif mt-4 text-2xl">{title}</p>}
        {body && <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{body}</p>}
        {actions && <div className="mt-8 flex flex-wrap items-center justify-center gap-5">{actions}</div>}
      </div>
    );
  }

  // Full-bleed variant: always the whole page, so like PageHero it cancels the
  // clearance Layout adds for the fixed header and puts it back as its own
  // padding — the dark band then reaches the top of the viewport. Both read
  // --header-h so they track whatever height the header is composed at.
  return (
    <section
      className={`-mt-[var(--header-h)] flex min-h-svh items-center bg-ink pt-[var(--header-h)] text-center text-white ${className}`}
    >
      <div className="container-lux py-20">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {title && <h1 className="heading-serif mt-5 text-4xl leading-[1.05] md:text-6xl">{title}</h1>}
        {body && (
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-white/60 md:text-base">
            {body}
          </p>
        )}
        {actions && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">{actions}</div>
        )}
      </div>
    </section>
  );
}
