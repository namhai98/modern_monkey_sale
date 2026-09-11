import { useLocale } from '../context/LocaleContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { privacy, privacyContact, PRIVACY_UPDATED } from '../lib/legal';
import PageHero from '../components/PageHero';
import Reveal from '../components/Reveal';
import Section from '../components/Section';

/* The privacy notice. Prose, so it gets the narrow measure the rest of the
   house uses for body copy (max-w-2xl) rather than the full container width —
   a legal page is only useful if it is actually readable. */
export default function Privacy() {
  const { t, locale } = useLocale();
  useDocumentTitle(t('privacy.title'));
  const doc = privacy[locale] || privacy.en;

  // Chrome's mn-MN data still renders month names in English, which reads as a
  // bug next to Cyrillic body copy — so Mongolian gets the ordinal form the
  // language actually uses.
  const d = new Date(PRIVACY_UPDATED);
  const updated =
    locale === 'mn'
      ? `${d.getFullYear()} оны ${d.getMonth() + 1} дүгээр сарын ${d.getDate()}`
      : d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <PageHero
        compact
        eyebrow={t('privacy.eyebrow')}
        title={t('privacy.title')}
        lead={doc.intro}
        crumbs={[{ label: t('privacy.title') }]}
      >
        <p className="micro mt-6 tracking-[0.2em] text-white/55">
          {t('privacy.updated', { date: updated })}
        </p>
      </PageHero>

      <Section pad="content" containerClassName="max-w-2xl">
        <div className="space-y-14">
          {doc.sections.map((s, i) => (
            <Reveal key={s.h} delay={Math.min(i, 4) * 0.05}>
              <section>
                <h2 className="heading-serif text-2xl md:text-3xl">{s.h}</h2>

                {s.p?.map((para) => (
                  <p key={para.slice(0, 40)} className="mt-5 text-sm leading-relaxed text-muted">
                    {para}
                  </p>
                ))}

                {s.list && (
                  <dl className="mt-7 space-y-6 border-t border-line pt-7">
                    {s.list.map(([term, def]) => (
                      <div key={term}>
                        {/* Not `text-gold` like other micro-labels: these terms
                            are content, not decoration, and gold on the light
                            theme's white lands at 2.4:1 — unreadable for a
                            document whose only job is to be read. */}
                        <dt className="micro text-foreground">{term}</dt>
                        <dd className="mt-2 text-sm leading-relaxed text-muted">{def}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {s.after?.map((para) => (
                  <p key={para.slice(0, 40)} className="mt-7 text-sm leading-relaxed text-muted">
                    {para}
                  </p>
                ))}
              </section>
            </Reveal>
          ))}

          <Reveal>
            <section className="border-t border-line pt-10">
              <p className="eyebrow">{t('privacy.contactHead')}</p>
              <a
                href={`mailto:${privacyContact}`}
                className="link-lux heading-serif mt-5 inline-block text-xl transition-colors hover:text-gold"
              >
                {privacyContact}
              </a>
            </section>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
