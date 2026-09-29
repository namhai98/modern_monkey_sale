/* Shared frame for the three account-entry screens (sign in, forgot, reset).
   These routes hide the footer, so they get the presentation site's full-bleed
   centred treatment instead: a single column, generously spaced, opened by a
   gold eyebrow and a serif headline. No card, no box, no shadow — the page
   itself is the surface.

   No wordmark here: the header above stays mounted on every one of these
   routes (Layout only hides the footer), so repeating the brand name in the
   page body was a duplicate, not an anchor. */
export default function AuthShell({ eyebrow, title, lead, children }) {
  return (
    <section className="flex min-h-[calc(100svh-5rem)] items-center py-16 md:py-24">
      <div className="container-lux">
        <div className="mx-auto max-w-sm">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="heading-serif mt-5 text-3xl leading-[1.1] md:text-4xl">{title}</h1>
          {lead && <p className="mt-5 text-sm leading-relaxed text-muted">{lead}</p>}

          <div className="mt-10">{children}</div>
        </div>
      </div>
    </section>
  );
}
