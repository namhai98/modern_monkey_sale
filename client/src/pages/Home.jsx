import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Reveal, { RevealScale } from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import CollectionCard from '../components/CollectionCard';
import Section from '../components/Section';
import SectionHeading, { RowHeading } from '../components/SectionHeading';
import Button from '../components/Button';
import Icon from '../components/Icon';
import ImageFallback from '../components/ImageFallback';
import { homeMedia, resizeUnsplash } from '../lib/media';
import { site, mapsUrl, telHref } from '../lib/site';
import { useLocale } from '../context/LocaleContext';

/* The home page as a stack of sections in the presentation site's rhythm and
   order: a full-bleed cinematic hero → a centred maison statement → the
   collections → editorial and product rows → the numbered craftsmanship band →
   the "visit the boutique" close. Dark bands alternate with theme bands, every
   section sits on the py-14 md:py-24 lg:py-36 scale inside one container.

   Scrims are fixed `ink`, so a dark band reads as a dark band on the light
   theme too, exactly as on the marketing site. Nothing here knows which theme
   is active. */

/* The standard inline CTA: gold micro-type, the link-lux underline sweep, and
   an arrow to signal forward navigation. */
function TextLink({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`link-lux micro inline-flex items-center gap-2 tracking-[0.3em] text-gold ${className}`}
    >
      {children}
      <Icon name="arrowRight" className="h-3.5 w-3.5" />
    </Link>
  );
}

/* Full-viewport opener, choreographed like the marketing site's: the image
   drifts down at a quarter of the scroll speed while the copy fades out over
   the first 70% of the hero; the eyebrow, the two headline lines (the second
   in gold), the support line and the buttons enter on a timed stagger; a gold
   rule marks the left edge and a bobbing cue sits at the foot. The headline is
   keyed on the language so the line reveal replays when the shopper switches. */
function Hero() {
  const { t, locale } = useLocale();
  const ref = useRef(null);
  const bgRef = useRef(null);
  const copyRef = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const h = el.offsetHeight || 1;
      const p = Math.min(1, Math.max(0, window.scrollY / h));
      if (bgRef.current) bgRef.current.style.transform = `translateY(${p * 24}%)`;
      if (copyRef.current) copyRef.current.style.opacity = String(Math.max(0, 1 - p / 0.7));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const lines = [t('home.hero.title'), t('home.hero.title2')];

  return (
    <section
      ref={ref}
      className="relative flex min-h-svh items-center overflow-hidden bg-ink text-white"
      aria-label="Modern Monkey"
    >
      <div ref={bgRef} className="absolute inset-0 will-change-transform" aria-hidden="true">
        <ImageFallback
          src={homeMedia.hero}
          alt=""
          className="h-[120%] w-full object-cover motion-safe:animate-[fadeIn_1.6s_ease-out]"
        />
        {/* Fixed-ink scrim, not a theme-reactive veil — the headline has to hold
            its contrast regardless of which theme the shopper picked. */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-ink/20" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink to-transparent" />
      </div>

      {/* Gold vertical rule — the marketing site's left-edge measure. */}
      <div
        aria-hidden="true"
        className="absolute left-6 top-1/2 hidden h-40 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-gold/60 to-transparent md:left-12 lg:block"
      />

      <div ref={copyRef} className="container-lux relative z-10 pt-20">
        <p className="eyebrow fade-up" style={{ animationDelay: '0.3s' }}>
          {t('home.hero.eyebrow')}
        </p>

        <h1
          key={locale}
          className="heading-serif mt-8 max-w-4xl text-[clamp(2.6rem,8vw,6.5rem)] leading-[1.02]"
        >
          {lines.map((line, i) => (
            <span key={line} className="block overflow-hidden">
              <span
                className={`line-in block ${i === 1 ? 'text-gold' : ''}`}
                style={{ animationDelay: `${0.45 + i * 0.18}s` }}
              >
                {line}
              </span>
            </span>
          ))}
        </h1>

        <p
          className="fade-up mt-8 max-w-xl text-base leading-relaxed text-white/65 md:text-lg"
          style={{ animationDelay: '1s' }}
        >
          {t('home.hero.support')}
        </p>

        <div className="fade-up mt-12 flex flex-wrap gap-5" style={{ animationDelay: '1.2s' }}>
          <Button to="/shop?all=1">{t('home.hero.cta')}</Button>
          <Button to="/shop?sale=1" variant="outline">
            {t('nav.sale')}
          </Button>
        </div>
      </div>

      {/* Scroll cue — decorative, so it is hidden on mobile rather than shrunk. */}
      <div
        aria-hidden="true"
        className="fade-up absolute bottom-10 left-1/2 hidden -translate-x-1/2 md:block"
        style={{ animationDelay: '2s', animationDuration: '1s' }}
      >
        <div className="flex flex-col items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.4em] text-white/40">{t('nav.scroll')}</span>
          <span className="cue-bob h-12 w-px bg-gradient-to-b from-gold to-transparent" />
        </div>
      </div>
    </section>
  );
}

/* The marketing site's introduction: one centred serif statement with the
   operative phrase in gold. A pull-quote is one of the few places the design
   sets running copy in Playfair. */
function Statement() {
  const { t } = useLocale();
  return (
    <Section aria-label={t('home.statement.eyebrow')}>
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">{t('home.statement.eyebrow')}</p>
        <p className="heading-serif mt-8 text-2xl leading-[1.5] md:text-[2rem] md:leading-[1.45]">
          {t('home.statement.before')}
          <span className="text-gold">{t('home.statement.gold')}</span>
          {t('home.statement.after')}
        </p>
      </Reveal>
    </Section>
  );
}

function House() {
  const { t } = useLocale();
  return (
    <Section tone="surface">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <RevealScale>
          <ImageFallback
            src={homeMedia.editorialLeft}
            alt=""
            className="aspect-[4/5] w-full object-cover"
          />
        </RevealScale>
        <div className="lg:pl-6">
          <SectionHeading
            eyebrow={t('home.house.eyebrow')}
            title={t('home.house.title')}
            lead={t('home.house.body')}
            action={<TextLink to="/shop?all=1">{t('home.house.cta')}</TextLink>}
          />
        </div>
      </div>
    </Section>
  );
}

const BAND_SLUGS = ['bags', 'watches', 'apparel'];

/* The category entry points. Odd cards drop by 48px on large screens for the
   staggered editorial grid the presentation site uses, and the heading row
   carries the "view all" link on its right, as on the marketing site. */
function CollectionCards({ labels }) {
  const { t } = useLocale();
  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-8">
        <SectionHeading
          eyebrow={t('home.collections.eyebrow')}
          title={t('home.collections.title')}
        />
        <Reveal delay={0.2}>
          <TextLink to="/shop">{t('common.viewAll')}</TextLink>
        </Reveal>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 md:mt-16 lg:grid-cols-3">
        {BAND_SLUGS.map((slug, i) => (
          <Reveal key={slug} delay={i * 0.1} className={i % 2 === 1 ? 'lg:mt-12' : ''}>
            <RevealScale>
              <CollectionCard
                to={`/shop?category=${slug}`}
                label={labels[slug]}
                index={i}
                image={homeMedia.bands[slug]}
              />
            </RevealScale>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* One product row per category. Same three requests as before — the shape of
   the data and the endpoints are untouched; only the frame around them changed. */
function CategoryStrips({ labels }) {
  const { t } = useLocale();
  const [byCat, setByCat] = useState({});

  useEffect(() => {
    Promise.all(
      BAND_SLUGS.map((slug) =>
        client
          .get('/products', { params: { category: slug, limit: 3 } })
          .then((res) => [slug, res.data.items])
          .catch(() => [slug, []])
      )
    ).then((pairs) => setByCat(Object.fromEntries(pairs)));
  }, []);

  return BAND_SLUGS.map((slug, i) => {
    const items = byCat[slug];
    if (!items?.length) return null;
    return (
      <Section key={slug} pad="content" tone={i % 2 === 0 ? 'surface' : 'theme'}>
        <RowHeading
          eyebrow={labels[slug]}
          title={t('home.band.shop', { cat: labels[slug] })}
          action={<TextLink to={`/shop?category=${slug}`}>{t('shop.explore')}</TextLink>}
        />
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:mt-16 md:grid-cols-3">
          {items.map((p, j) => (
            <Reveal key={p.id} delay={j * 0.08}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </Section>
    );
  });
}

function Featured() {
  const { t } = useLocale();
  const [items, setItems] = useState([]);

  useEffect(() => {
    client
      .get('/products', { params: { sort: 'created_at', order: 'desc', limit: 4 } })
      .then((res) => setItems(res.data.items))
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;
  return (
    <Section>
      <SectionHeading
        eyebrow={t('home.featured.eyebrow')}
        title={t('home.featured.title')}
        align="center"
      />
      <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-14 md:mt-16 lg:grid-cols-4">
        {items.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.08}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-14 border-t border-line pt-10 text-center md:mt-20 md:pt-16">
        <Button to="/shop?all=1" variant="outline-dark">
          {t('shop.everything')}
        </Button>
      </Reveal>
    </Section>
  );
}

/* The marketing site's craftsmanship band: a dark split with a two-line
   heading (second line gold), three numbered steps whose gold index brightens
   on hover, and a portrait image with a small square inset framed in ink,
   overlapping the bottom-left corner. */
function Craftsmanship() {
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
              <span className="text-gold">{t('home.craft.title2')}</span>
            </h2>
          </Reveal>
          <div className="mt-10 space-y-8 md:mt-14 md:space-y-12">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.12}>
                <div className="group flex gap-5 border-b border-white/10 pb-7 md:gap-8 md:pb-10">
                  <span className="heading-serif text-3xl text-gold/50 transition-colors duration-500 group-hover:text-gold">
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
   centred split headline with its second half in gold, the address and hours
   on one line with gold icons, and a gold + outline button pair. */
function Visit() {
  const { t } = useLocale();
  const phone = site.phones[0];

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
            <span className="text-gold">{t('home.visit.title2')}</span>
          </h2>
          <p className="mx-auto mt-8 max-w-lg text-base leading-relaxed text-white/60">
            {t('home.visit.text')}
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-white/70 md:mt-10 md:flex-row md:gap-6">
            <span className="inline-flex items-center gap-2">
              <Icon name="mapPin" className="h-4 w-4 text-gold" />
              {t('home.visit.address')}
            </span>
            <span className="hidden h-4 w-px bg-white/20 md:block" aria-hidden="true" />
            <span className="inline-flex items-center gap-2">
              <Icon name="clock" className="h-4 w-4 text-gold" />
              {t('home.visit.hours')}
            </span>
          </div>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-wrap justify-center gap-4 md:mt-12 md:gap-5">
            <Button href={mapsUrl} target="_blank" rel="noopener noreferrer">
              {t('home.visit.cta')}
            </Button>
            <Button href={telHref(phone)} variant="outline">
              {t('home.visit.call')} {phone}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  const { t } = useLocale();
  const labels = {
    bags: t('nav.bags'),
    watches: t('nav.watches'),
    apparel: t('nav.apparel'),
  };

  return (
    <>
      <Hero />
      <Statement />
      <CollectionCards labels={labels} />
      <House />
      <CategoryStrips labels={labels} />
      <Featured />
      <Craftsmanship />
      <Visit />
    </>
  );
}
