import { Link } from 'react-router-dom';
import Button from './Button';
import Icon from './Icon';
import ImageFallback from './ImageFallback';
import Reveal, { RevealScale } from './Reveal';
import Section from './Section';
import SectionHeading from './SectionHeading';
import { useLocale } from '../context/LocaleContext';
import { homeMedia, resizeUnsplash } from '../lib/media';
import { site, telHref } from '../lib/site';

/* The maison's brand sections — statement, house, craftsmanship and the
   boutique close. Shared by the home page and the /story page, so the two
   always tell the story in the same words and pictures. */

/* The standard inline CTA: gold micro-type, the link-lux underline sweep, and
   an arrow to signal forward navigation. */
export function TextLink({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`link-lux tap-area micro inline-flex items-center gap-2 tracking-button text-gold ${className}`}
    >
      {children}
      <Icon name="arrowRight" className="h-3.5 w-3.5" />
    </Link>
  );
}

/* Running copy with the house name picked out in gold wherever it appears —
   the name stays inside the translated sentence, so word order and case
   endings ("Modern Monkey-оос") are the translator's, not the markup's. */
function GoldBrand({ text }) {
  const parts = text.split(site.name);
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && <span className="text-gold">{site.name}</span>}
    </span>
  ));
}

/* The marketing site's introduction: one centred display statement with the
   operative phrase in gold. A pull-quote is one of the few places the design
   sets running copy in Montserrat instead of Inter. */
export function Statement() {
  const { t } = useLocale();
  return (
    <Section aria-label={t('home.statement.eyebrow')}>
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">{t('home.statement.eyebrow')}</p>
        <p className="heading-serif mt-8 text-[1.3rem] leading-[1.6] sm:text-2xl sm:leading-[1.5] md:text-[2rem] md:leading-[1.45]">
          {t('home.statement.before')}
          <span className="gold-script">{t('home.statement.gold')}</span>
          {t('home.statement.after')}
        </p>
      </Reveal>
    </Section>
  );
}

export function House() {
  const { t } = useLocale();
  return (
    <Section tone="surface">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <RevealScale>
          {/* The house mark rather than a stock photo. It sits on its own
              black square, so the 4:5 frame only trims empty margin. */}
          <ImageFallback
            src={homeMedia.houseLogo}
            alt="Modern Monkey"
            className="mx-auto aspect-square w-full max-w-sm bg-black object-cover md:max-w-md lg:aspect-[4/5] lg:max-w-none"
          />
        </RevealScale>
        <div className="lg:pl-6">
          <SectionHeading
            eyebrow={t('home.house.eyebrow')}
            title={t('home.house.title')}
            lead={`${t('home.house.body')}\n${t('home.house.body2')}`}
            action={<TextLink to="/shop?all=1">{t('home.house.cta')}</TextLink>}
          />
        </div>
      </div>
    </Section>
  );
}

/* The marketing site's craftsmanship band: a dark split with a two-line
   heading (second line gold), three numbered steps whose gold index brightens
   on hover, and a portrait image with a small square inset framed in ink,
   overlapping the bottom-left corner. */
export function Craftsmanship() {
  const { t } = useLocale();
  const steps = [1, 2, 3].map((n) => ({
    title: t(`home.craft.step${n}.title`),
    text: t(`home.craft.step${n}.text`),
  }));

  return (
    <Section tone="dark" aria-labelledby="craft-heading">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <Reveal>
            <p className="eyebrow">{t('home.craft.eyebrow')}</p>
            <h2 id="craft-heading" className="heading-serif mt-5 text-4xl leading-[1.08] md:text-5xl">
              {t('home.craft.title1')}
              <br />
              <span className="gold-script">{t('home.craft.title2')}</span>
            </h2>
          </Reveal>
          <div className="mt-10 space-y-8 md:mt-14 md:space-y-12">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.12}>
                <div className="group flex gap-5 border-b border-white/10 pb-7 md:gap-8 md:pb-10">
                  {/* A fixed column, so every title starts on the same line. */}
                  <span className="heading-serif w-12 shrink-0 text-3xl text-gold/50 transition-colors duration-500 group-hover:text-gold md:w-14">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="heading-serif text-xl">{s.title}</h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55">{s.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="relative">
          <RevealScale>
            <ImageFallback
              src={resizeUnsplash(homeMedia.atelier, 1400)}
              alt=""
              className="aspect-[4/5] w-full object-cover"
            />
          </RevealScale>
          <Reveal delay={0.3} className="absolute -bottom-10 -left-6 hidden w-56 md:block">
            <ImageFallback
              src={resizeUnsplash(homeMedia.bands.watches, 600)}
              alt=""
              className="aspect-square w-full border-8 border-ink object-cover"
            />
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

/* The close of every marketing page: a dark band over a faded image, a
   centred two-line headline with its second line in the gold script, the
   address, hours and phone numbers on one line with gold icons, and a single
   shop button. */
export function Visit() {
  const { t } = useLocale();

  return (
    <section
      className="relative overflow-hidden bg-ink py-16 text-white md:py-32 lg:py-44"
      aria-labelledby="visit-heading"
    >
      <ImageFallback
        src={resizeUnsplash(homeMedia.bands.bags, 2000)}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/60 to-ink" aria-hidden="true" />
      <div className="container-lux relative z-10 text-center">
        <Reveal>
          <p className="eyebrow">{t('home.visit.eyebrow')}</p>
          <h2
            id="visit-heading"
            className="heading-serif mx-auto mt-6 max-w-2xl text-4xl leading-[1.1] md:text-6xl"
          >
            {t('home.visit.title1')}
            <span className="gold-script block">{t('home.visit.title2').trim()}</span>
          </h2>
          <p className="mx-auto mt-8 max-w-lg text-base leading-relaxed text-white/60">
            <GoldBrand text={t('home.visit.text')} />
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-white/70 md:mt-10 md:flex-row md:gap-6">
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors hover:text-gold"
            >
              <Icon name="mapPin" className="h-4 w-4 text-gold" />
              {t('home.visit.address')}
            </a>
            <span className="hidden h-4 w-px bg-white/20 md:block" aria-hidden="true" />
            <span className="inline-flex items-center gap-2">
              <Icon name="clock" className="h-4 w-4 text-gold" />
              {t('home.visit.hours')}
            </span>
            <span className="hidden h-4 w-px bg-white/20 md:block" aria-hidden="true" />
            <span className="inline-flex items-center gap-2">
              <Icon name="phone" className="h-4 w-4 text-gold" />
              {site.phones.map((p, i) => (
                <span key={p}>
                  {i > 0 && <span className="mr-2 text-white/30">·</span>}
                  <a href={telHref(p)} className="transition-colors hover:text-gold">
                    {p}
                  </a>
                </span>
              ))}
            </span>
          </div>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-10 flex justify-center md:mt-12">
            <Button to="/shop?all=1">{t('home.visit.cta')}</Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
