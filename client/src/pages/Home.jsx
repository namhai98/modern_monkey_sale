import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import { homeMedia, resizeUnsplash } from '../lib/media';
import { useLocale } from '../context/LocaleContext';

/* ────────────────────────────────────────────────────────────────
   Home-only art direction: modern / edgy, black + yellow.
   Scoped entirely to this file — every other screen keeps the
   ivory / ink theme.
   ──────────────────────────────────────────────────────────────── */
const INK = '#0e0e0c'; // near-black
const PAPER = '#f5f4ee'; // light neutral (product strips, light text)
const YELLOW = '#f5c518';

// near-monochrome photo grade so the yellow accents carry the colour
const MONO = 'grayscale(.9) contrast(1.12) brightness(.82)';
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")";

function Hero() {
  const { t } = useLocale();
  return (
    <section
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden"
      style={{ background: INK, color: PAPER }}
    >
      <img
        src={homeMedia.hero}
        alt=""
        style={{ filter: MONO }}
        className="absolute inset-0 h-full w-full object-cover opacity-50 motion-safe:animate-[fadeIn_1.6s_ease-out]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 80% 10%, rgba(245,197,24,.30), transparent 55%),' +
            'linear-gradient(180deg, rgba(14,14,12,.45), rgba(14,14,12,.88))',
        }}
      />
      <div
        className="absolute inset-0 mix-blend-overlay opacity-[0.16]"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
        <p className="eyebrow fade-up" style={{ color: YELLOW, animationDelay: '0.3s' }}>
          {t('home.hero.eyebrow')}
        </p>
        <h1
          className="font-display text-5xl md:text-7xl lg:text-8xl mt-4 max-w-4xl leading-[1.02] fade-up"
          style={{ animationDelay: '0.45s' }}
        >
          {t('home.hero.title')}
        </h1>
        <span
          className="mt-6 block h-px w-16 fade-up"
          style={{ background: YELLOW, animationDelay: '0.6s' }}
        />
        <p
          className="mt-6 max-w-sm text-sm fade-up"
          style={{ color: 'rgba(245,244,238,.72)', animationDelay: '0.72s' }}
        >
          {t('home.hero.support')}
        </p>
        <div className="fade-up" style={{ animationDelay: '0.9s' }}>
          <Link
            to="/shop"
            className="mt-10 inline-flex h-12 items-center justify-center px-10 eyebrow transition-colors"
            style={{ background: YELLOW, color: INK }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#ffdd3d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = YELLOW)}
          >
            {t('home.hero.cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}

function Editorial() {
  const { t } = useLocale();
  return (
    <section style={{ background: INK, color: PAPER }}>
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <Reveal>
          <div className="relative">
            <img
              src={homeMedia.editorialLeft}
              alt=""
              style={{ filter: MONO }}
              className="w-full aspect-[4/5] object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(200deg, rgba(245,197,24,.14), rgba(14,14,12,.55))' }}
            />
          </div>
        </Reveal>
        <Reveal delay={0.1} className="md:pl-10">
          <p className="eyebrow" style={{ color: YELLOW }}>{t('home.house.eyebrow')}</p>
          <h2 className="font-display text-4xl md:text-5xl mt-4 mb-6 leading-tight">
            {t('home.house.title')}
          </h2>
          <p className="leading-relaxed max-w-md" style={{ color: 'rgba(245,244,238,.68)' }}>
            {t('home.house.body')}
          </p>
          <Link
            to="/shop"
            className="inline-block mt-8 eyebrow link-underline transition-colors"
            style={{ color: YELLOW }}
          >
            {t('home.house.cta')}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

const BAND_SLUGS = ['bags', 'watches', 'apparel'];

function CategoryBands() {
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

  const bands = [
    { slug: 'bags', label: t('nav.bags'), img: homeMedia.bands.bags },
    { slug: 'watches', label: t('nav.watches'), img: homeMedia.bands.watches },
    { slug: 'apparel', label: t('nav.apparel'), img: homeMedia.bands.apparel },
  ];

  return (
    <section style={{ background: INK }}>
      {bands.map((b, i) => (
        <div key={b.slug}>
          <Reveal as="div">
            <Link
              to={`/shop?category=${b.slug}`}
              className="group relative block h-[60vh] min-h-[380px] md:h-[72vh] w-full overflow-hidden"
            >
              <img
                src={b.img}
                alt=""
                style={{ filter: MONO }}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    i % 2
                      ? 'linear-gradient(90deg, rgba(14,14,12,.86), rgba(14,14,12,.25) 55%, rgba(245,197,24,.14))'
                      : 'linear-gradient(90deg, rgba(245,197,24,.16), rgba(14,14,12,.3) 45%, rgba(14,14,12,.86))',
                }}
              />
              <div
                className="relative h-full flex flex-col items-center justify-center"
                style={{ color: PAPER }}
              >
                <p
                  className="font-display text-7xl md:text-8xl"
                  style={{ color: 'transparent', WebkitTextStroke: `1px ${YELLOW}` }}
                >
                  {`0${i + 1}`}
                </p>
                <h3 className="font-display text-5xl md:text-6xl mt-1">{b.label}</h3>
                <span className="mt-6 eyebrow link-underline" style={{ color: YELLOW }}>
                  {t('home.band.shop', { cat: b.label })}
                </span>
              </div>
            </Link>
          </Reveal>

          {byCat[b.slug]?.length > 0 && (
            <div style={{ background: PAPER }}>
              <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
                <div className="flex items-baseline justify-between mb-8 md:mb-10">
                  <p className="eyebrow" style={{ color: '#111' }}>{b.label}</p>
                  <Link
                    to={`/shop?category=${b.slug}`}
                    className="eyebrow link-underline"
                    style={{ color: '#111' }}
                  >
                    {t('shop.explore')}
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-x-4 md:gap-x-6 gap-y-10">
                  {byCat[b.slug].map((p, j) => (
                    <Reveal key={p.id} delay={j * 0.06}>
                      <ProductCard product={p} />
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
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
    <section style={{ background: PAPER }}>
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal className="text-center mb-12 md:mb-16">
          <p className="eyebrow" style={{ color: '#111' }}>{t('home.featured.eyebrow')}</p>
          <h2 className="font-display text-4xl md:text-5xl mt-3" style={{ color: INK }}>
            {t('home.featured.title')}
          </h2>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-14">
          {items.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Atelier() {
  const { t } = useLocale();
  return (
    <section className="relative" style={{ background: INK, color: PAPER }}>
      <img
        src={resizeUnsplash(homeMedia.atelier, 2000)}
        alt=""
        style={{ filter: MONO }}
        className="h-[65vh] md:h-[82vh] w-full object-cover opacity-65"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(14,14,12,.55), rgba(14,14,12,.32) 40%, rgba(245,197,24,.20))',
        }}
      />
      <Reveal className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <p className="eyebrow" style={{ color: YELLOW }}>{t('home.atelier.eyebrow')}</p>
        <h2 className="font-display text-4xl md:text-6xl mt-4 max-w-3xl leading-tight">
          {t('home.atelier.title')}
        </h2>
        <p className="mt-6 max-w-lg leading-relaxed" style={{ color: 'rgba(245,244,238,.72)' }}>
          {t('home.atelier.body')}
        </p>
      </Reveal>
    </section>
  );
}

export default function Home() {
  return (
    <div style={{ background: INK }}>
      <Hero />
      <Editorial />
      <CategoryBands />
      <Featured />
      <Atelier />
    </div>
  );
}
