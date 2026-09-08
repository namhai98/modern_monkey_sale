import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import { homeMedia, resizeUnsplash } from '../lib/media';
import { useLocale } from '../context/LocaleContext';

/* ────────────────────────────────────────────────────────────────
   Home-only art direction: modern / luxury / edgy in warm
   brown-orange-yellow-black. Scoped entirely to this file — every
   other screen keeps the ivory / ink theme.
   ──────────────────────────────────────────────────────────────── */
const INK = '#140b02'; // brown-black
const CREAM = '#f4e7d6';
const ORANGE = '#e0621f';
const YELLOW = '#f5c518';

// pushes any photograph into the warm amber world
const WARM = 'sepia(.32) saturate(1.35) hue-rotate(-12deg) brightness(.82) contrast(1.06)';
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")";

function Hero() {
  const { t } = useLocale();
  return (
    <section
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden"
      style={{ background: INK, color: CREAM }}
    >
      <img
        src={homeMedia.hero}
        alt=""
        style={{ filter: WARM }}
        className="absolute inset-0 h-full w-full object-cover opacity-55 motion-safe:animate-[fadeIn_1.6s_ease-out]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 78% 12%, rgba(240,165,0,.42), transparent 55%),' +
            'radial-gradient(120% 120% at 12% 100%, rgba(224,98,31,.35), transparent 60%),' +
            'linear-gradient(180deg, rgba(20,11,2,.35), rgba(20,11,2,.82))',
        }}
      />
      <div
        className="absolute inset-0 mix-blend-overlay opacity-[0.18]"
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
          style={{ background: ORANGE, animationDelay: '0.6s' }}
        />
        <p
          className="mt-6 max-w-sm text-sm fade-up"
          style={{ color: 'rgba(244,231,214,.75)', animationDelay: '0.72s' }}
        >
          {t('home.hero.support')}
        </p>
        <div className="fade-up" style={{ animationDelay: '0.9s' }}>
          <Link
            to="/shop"
            className="mt-10 inline-flex h-12 items-center justify-center px-10 eyebrow transition-colors"
            style={{ background: ORANGE, color: INK }}
            onMouseEnter={(e) => (e.currentTarget.style.background = YELLOW)}
            onMouseLeave={(e) => (e.currentTarget.style.background = ORANGE)}
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
    <section style={{ background: INK, color: CREAM }}>
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <Reveal>
          <div className="relative">
            <img
              src={homeMedia.editorialLeft}
              alt=""
              style={{ filter: WARM }}
              className="w-full aspect-[4/5] object-cover"
            />
            <div
              className="absolute inset-0 mix-blend-multiply"
              style={{ background: 'linear-gradient(200deg, rgba(224,98,31,.28), rgba(20,11,2,.55))' }}
            />
          </div>
        </Reveal>
        <Reveal delay={0.1} className="md:pl-10">
          <p className="eyebrow" style={{ color: YELLOW }}>{t('home.house.eyebrow')}</p>
          <h2 className="font-display text-4xl md:text-5xl mt-4 mb-6 leading-tight">
            {t('home.house.title')}
          </h2>
          <p className="leading-relaxed max-w-md" style={{ color: 'rgba(244,231,214,.7)' }}>
            {t('home.house.body')}
          </p>
          <Link
            to="/shop"
            className="inline-block mt-8 eyebrow link-underline transition-colors"
            style={{ color: ORANGE }}
          >
            {t('home.house.cta')}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function CategoryBands() {
  const { t } = useLocale();
  const bands = [
    { slug: 'bags', label: t('nav.bags'), img: homeMedia.bands.bags },
    { slug: 'watches', label: t('nav.watches'), img: homeMedia.bands.watches },
    { slug: 'apparel', label: t('nav.apparel'), img: homeMedia.bands.apparel },
  ];
  return (
    <section style={{ background: INK }}>
      {bands.map((b, i) => (
        <Reveal key={b.slug} as="div">
          <Link
            to={`/shop?category=${b.slug}`}
            className="group relative block h-[60vh] min-h-[380px] md:h-[72vh] w-full overflow-hidden"
          >
            <img
              src={b.img}
              alt=""
              style={{ filter: WARM }}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  i % 2
                    ? 'linear-gradient(90deg, rgba(20,11,2,.82), rgba(74,44,20,.25) 55%, rgba(224,98,31,.16))'
                    : 'linear-gradient(90deg, rgba(224,98,31,.18), rgba(74,44,20,.28) 45%, rgba(20,11,2,.82))',
              }}
            />
            <div
              className="relative h-full flex flex-col items-center justify-center"
              style={{ color: CREAM }}
            >
              <p
                className="font-display text-7xl md:text-8xl"
                style={{ color: 'transparent', WebkitTextStroke: `1px rgba(245,197,24,.55)` }}
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
    <section style={{ background: '#f6ece0' }}>
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal className="text-center mb-12 md:mb-16">
          <p className="eyebrow" style={{ color: '#b5541c' }}>{t('home.featured.eyebrow')}</p>
          <h2 className="font-display text-4xl md:text-5xl mt-3" style={{ color: '#2a1608' }}>
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
    <section className="relative" style={{ background: INK, color: CREAM }}>
      <img
        src={resizeUnsplash(homeMedia.atelier, 2000)}
        alt=""
        style={{ filter: WARM }}
        className="h-[65vh] md:h-[82vh] w-full object-cover opacity-70"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(20,11,2,.55), rgba(20,11,2,.35) 40%, rgba(224,98,31,.30))',
        }}
      />
      <Reveal className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <p className="eyebrow" style={{ color: YELLOW }}>{t('home.atelier.eyebrow')}</p>
        <h2 className="font-display text-4xl md:text-6xl mt-4 max-w-3xl leading-tight">
          {t('home.atelier.title')}
        </h2>
        <p className="mt-6 max-w-lg leading-relaxed" style={{ color: 'rgba(244,231,214,.75)' }}>
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
