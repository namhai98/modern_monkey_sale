import { Fragment, useEffect, useRef, useState } from 'react';
import client from '../api/client';
import { Craftsmanship, House, Statement, TextLink, Visit } from '../components/BrandSections';
import Button from '../components/Button';
import CollectionCard from '../components/CollectionCard';
import ImageFallback from '../components/ImageFallback';
import ProductCard from '../components/ProductCard';
import Reveal, { RevealScale } from '../components/Reveal';
import Section from '../components/Section';
import SectionHeading from '../components/SectionHeading';
import { useLocale } from '../context/LocaleContext';
import { homeMedia, unsplashSrcSet } from '../lib/media';

/* The home page as a stack of sections in the presentation site's rhythm and
   order: a full-bleed cinematic hero → a centred maison statement → the
   collections → editorial and product rows → the numbered craftsmanship band →
   the "visit the boutique" close. Dark bands alternate with theme bands, every
   section sits on the py-14 md:py-24 lg:py-36 scale inside one container.

   Scrims are fixed `ink`, so a dark band reads as a dark band on the light
   theme too, exactly as on the marketing site. Nothing here knows which theme
   is active. */

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
        {/* priority: this is the page's largest paint — lazy-loading it made
            the browser wait to discover it before fetching. */}
        <ImageFallback
          src={homeMedia.hero}
          srcSet={unsplashSrcSet(homeMedia.hero, [800, 1200, 1600, 2000])}
          sizes="100vw"
          alt=""
          priority
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
          className="heading-serif mt-8 max-w-6xl text-[clamp(2rem,4.4vw,4rem)] leading-[1.08] text-balance"
        >
          {lines.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-2">
              <span
                className={`line-in block ${i === 1 ? 'gold-script' : ''}`}
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
          <span className="text-badge uppercase tracking-eyebrow text-white/55">{t('nav.scroll')}</span>
          <span className="cue-bob h-12 w-px bg-gradient-to-b from-gold to-transparent" />
        </div>
      </div>
    </section>
  );
}

const BAND_SLUGS = ['bags', 'watches', 'apparel'];

/* The category entry points. Odd cards drop by 48px on large screens for the
   staggered editorial grid the presentation site uses, and the heading row
   carries the "view all" link on its right, as on the marketing site. */
const BAND_DESC_KEYS = {
  bags: 'home.collections.bagsDesc',
  watches: 'home.collections.watchesDesc',
  apparel: 'home.collections.apparelDesc',
};

function CollectionCards({ labels }) {
  const { t } = useLocale();
  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-8">
        <SectionHeading
          eyebrow={t('home.collections.eyebrow')}
          title={t('home.collections.title')}
          lead={t('home.collections.body')}
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
                meta={t(BAND_DESC_KEYS[slug])}
              />
            </RevealScale>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* The editorial band that leads into a category row: a dark full-bleed photo,
   a two-line headline (second line in the gold script) and one button into the
   category. The photo's subject sits right of centre and the scrim darkens the
   left, so the copy always reads on ink. */
function CategoryBanner({ slug }) {
  const { t } = useLocale();
  const image = homeMedia.banners[slug];
  const key = `home.banner.${slug}`;
  return (
    <section className="relative overflow-hidden bg-ink text-white" aria-labelledby={`banner-${slug}`}>
      <ImageFallback
        src={image}
        srcSet={unsplashSrcSet(image, [800, 1200, 1600, 2000])}
        sizes="100vw"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-80"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/10 md:via-ink/60"
        aria-hidden="true"
      />
      <div className="container-lux relative z-10 flex min-h-[26rem] items-center py-16 md:min-h-[32rem] lg:min-h-[36rem]">
        <Reveal className="max-w-xl">
          <h2 id={`banner-${slug}`} className="heading-serif text-4xl leading-[1.1] md:text-5xl">
            {t(`${key}.title1`)}
            <br />
            <span className="gold-script">{t(`${key}.title2`)}</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/65">{t(`${key}.lead`)}</p>
          <div className="mt-10">
            <Button to={`/shop?category=${slug}`}>{t(`${key}.cta`)}</Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* One product row per category. Same three requests as before — the shape of
   the data and the endpoints are untouched; only the frame around them changed.
   Every row after the first is introduced by its CategoryBanner. */
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
      <Fragment key={slug}>
      {i > 0 && homeMedia.banners[slug] && <CategoryBanner slug={slug} />}
      <Section pad="content" tone={i % 2 === 0 ? 'surface' : 'theme'}>
        {/* One heading, not eyebrow + title: both said the category name. The
            gold label carries it alone, scaled up to heading size. */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="eyebrow text-2xl tracking-label md:text-3xl">{labels[slug]}</h2>
          <TextLink to={`/shop?category=${slug}`}>{t('shop.explore')}</TextLink>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:mt-16 md:grid-cols-3">
          {items.map((p, j) => (
            <Reveal key={p.id} delay={j * 0.08}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </Section>
      </Fragment>
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
      .catch(() => { });
  }, []);

  if (items.length === 0) return null;
  return (
    <Section>
      <SectionHeading
        eyebrow={t('home.featured.eyebrow')}
        title={t('home.featured.title')}
        lead={t('home.featured.body')}
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

/* The next-newest batch of products (page 2 of the "recent" sort), so this
   row reads as a distinct set from Featured rather than repeating it. */
function NewArrivals() {
  const { t } = useLocale();
  const [items, setItems] = useState([]);

  useEffect(() => {
    client
      .get('/products', { params: { sort: 'created_at', order: 'desc', limit: 4, page: 2 } })
      .then((res) => setItems(res.data.items))
      .catch(() => { });
  }, []);

  if (items.length === 0) return null;
  return (
    <Section tone="surface">
      <SectionHeading
        title={t('home.newArrivals.title')}
        lead={t('home.newArrivals.body')}
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
        <Button to="/shop?sort=created_at:desc" variant="outline-dark">
          {t('home.newArrivals.cta')}
        </Button>
      </Reveal>
    </Section>
  );
}

/* Currently-discounted products, pulled with the same on_sale filter the
   shop page's "Sale" nav link uses. Hidden entirely when nothing is on sale. */
function DiscountBand() {
  const { t } = useLocale();
  const [items, setItems] = useState([]);

  useEffect(() => {
    client
      .get('/products', { params: { on_sale: '1', limit: 4 } })
      .then((res) => setItems(res.data.items))
      .catch(() => { });
  }, []);

  if (items.length === 0) return null;
  return (
    <Section>
      <SectionHeading
        title={t('home.discount.title')}
        lead={t('home.discount.body')}
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
        <Button to="/shop?sale=1" variant="outline-dark">
          {t('home.discount.cta')}
        </Button>
      </Reveal>
    </Section>
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
      <NewArrivals />
      <DiscountBand />
      <Craftsmanship />
      <Visit />
    </>
  );
}
