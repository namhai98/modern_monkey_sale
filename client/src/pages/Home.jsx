import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import { homeMedia, resizeUnsplash } from '../lib/media';
import { useLocale } from '../context/LocaleContext';

/* ────────────────────────────────────────────────────────────────
   Home-only art direction: light cream luxury editorial —
   warm ivory grounds, near-black serif type, a single gold accent.
   Scoped entirely to this file.
   ──────────────────────────────────────────────────────────────── */
const PAPER = '#f3eee2'; // warm cream ground
const STRIP = '#f9f6ee'; // slightly lighter — product rows
const INK = '#1b1712'; // near-black
const GOLD = '#c19a3f';
const DIM = 'rgba(27,23,18,.68)'; // secondary text

// campaign shots keep their colour; stock band imagery is softened + lifted so
// it sits inside the cream world
const PHOTO = 'contrast(1.04) saturate(1.03)';
const SOFT = 'grayscale(.32) contrast(1.03) brightness(1.04)';

function Hero() {
  const { t } = useLocale();
  return (
    <section
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden"
      style={{ background: PAPER, color: INK }}
    >
      <img
        src={homeMedia.hero}
        alt=""
        style={{ filter: PHOTO }}
        className="absolute inset-0 h-full w-full object-cover motion-safe:animate-[fadeIn_1.6s_ease-out]"
      />
      {/* cream veil on the left for the copy */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(243,238,226,.95) 0%, rgba(243,238,226,.55) 40%, rgba(243,238,226,0) 66%)',
        }}
      />

      <div className="relative h-full max-w-6xl mx-auto px-6 flex flex-col justify-center items-start text-left">
        <p className="eyebrow fade-up" style={{ color: GOLD, animationDelay: '0.3s' }}>
          {t('home.hero.eyebrow')}
        </p>
        <h1
          className="font-display text-5xl md:text-7xl lg:text-8xl mt-4 max-w-2xl leading-[1.02] fade-up"
          style={{ animationDelay: '0.45s' }}
        >
          {t('home.hero.title')}
        </h1>
        <span
          className="mt-6 block h-px w-16 fade-up"
          style={{ background: GOLD, animationDelay: '0.6s' }}
        />
        <p
          className="mt-6 max-w-sm text-sm fade-up"
          style={{ color: DIM, animationDelay: '0.72s' }}
        >
          {t('home.hero.support')}
        </p>
        <div className="fade-up" style={{ animationDelay: '0.9s' }}>
          <Link
            to="/shop"
            className="mt-10 inline-flex h-12 items-center justify-center px-10 eyebrow transition-colors"
            style={{ background: GOLD, color: '#fff' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = INK;
              e.currentTarget.style.color = PAPER;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = GOLD;
              e.currentTarget.style.color = '#fff';
            }}
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
    <section style={{ background: PAPER, color: INK }}>
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <Reveal>
          <img
            src={homeMedia.editorialLeft}
            alt=""
            style={{ filter: SOFT }}
            className="w-full aspect-[4/5] object-cover"
          />
        </Reveal>
        <Reveal delay={0.1} className="md:pl-10">
          <p className="eyebrow" style={{ color: GOLD }}>{t('home.house.eyebrow')}</p>
          <h2 className="font-display text-4xl md:text-5xl mt-4 mb-6 leading-tight">
            {t('home.house.title')}
          </h2>
          <p className="leading-relaxed max-w-md" style={{ color: DIM }}>
            {t('home.house.body')}
          </p>
          <Link
            to="/shop"
            className="inline-block mt-8 eyebrow link-underline"
            style={{ color: GOLD }}
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
    { slug: 'bags', label: t('nav.bags'), img: homeMedia.bands.bags, grade: PHOTO },
    { slug: 'watches', label: t('nav.watches'), img: homeMedia.bands.watches, grade: SOFT },
    { slug: 'apparel', label: t('nav.apparel'), img: homeMedia.bands.apparel, grade: SOFT },
  ];

  return (
    <section style={{ background: PAPER }}>
      {bands.map((b, i) => (
        <div key={b.slug}>
          <Reveal as="div">
            <Link
              to={`/shop?category=${b.slug}`}
              className="group relative block h-[56vh] min-h-[360px] md:h-[68vh] w-full overflow-hidden"
            >
              <img
                src={b.img}
                alt=""
                style={{ filter: b.grade }}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
              />
              {/* soft cream spotlight so the centred label stays legible */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(closest-side at 50% 52%, rgba(243,238,226,.9), rgba(243,238,226,.25) 78%, rgba(243,238,226,.05))',
                }}
              />
              <div
                className="relative h-full flex flex-col items-center justify-center"
                style={{ color: INK }}
              >
                <p
                  className="font-display text-7xl md:text-8xl"
                  style={{ color: 'transparent', WebkitTextStroke: `1px ${GOLD}` }}
                >
                  {`0${i + 1}`}
                </p>
                <h3 className="font-display text-5xl md:text-6xl mt-1">{b.label}</h3>
                <span className="mt-6 eyebrow link-underline" style={{ color: GOLD }}>
                  {t('home.band.shop', { cat: b.label })}
                </span>
              </div>
            </Link>
          </Reveal>

          {byCat[b.slug]?.length > 0 && (
            <div style={{ background: STRIP }}>
              <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
                <div className="flex items-baseline justify-between mb-8 md:mb-10">
                  <p className="eyebrow" style={{ color: GOLD }}>{b.label}</p>
                  <Link
                    to={`/shop?category=${b.slug}`}
                    className="eyebrow link-underline"
                    style={{ color: INK }}
                  >
                    {t('shop.explore')}
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-10">
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
          <p className="eyebrow" style={{ color: GOLD }}>{t('home.featured.eyebrow')}</p>
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
    <section className="relative" style={{ background: PAPER, color: INK }}>
      <img
        src={resizeUnsplash(homeMedia.atelier, 2000)}
        alt=""
        style={{ filter: PHOTO }}
        className="h-[56vh] md:h-[72vh] w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(243,238,226,.94) 0%, rgba(243,238,226,.5) 42%, rgba(243,238,226,0) 66%)',
        }}
      />
      <Reveal className="absolute inset-0">
        <div className="h-full max-w-6xl mx-auto px-6 flex flex-col justify-center items-start text-left">
          <p className="eyebrow" style={{ color: GOLD }}>{t('home.atelier.eyebrow')}</p>
          <h2 className="font-display text-4xl md:text-6xl mt-4 max-w-xl leading-tight">
            {t('home.atelier.title')}
          </h2>
          <p className="mt-6 max-w-md leading-relaxed" style={{ color: DIM }}>
            {t('home.atelier.body')}
          </p>
        </div>
      </Reveal>
    </section>
  );
}

export default function Home() {
  return (
    <div style={{ background: PAPER }}>
      <Hero />
      <Editorial />
      <CategoryBands />
      <Featured />
      <Atelier />
    </div>
  );
}
