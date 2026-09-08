import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import Button from '../components/Button';
import { media, resizeUnsplash } from '../lib/media';
import { useLocale } from '../context/LocaleContext';

function Hero() {
  const { t } = useLocale();
  return (
    <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden">
      <img
        src={media.hero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover motion-safe:animate-[fadeIn_1.4s_ease-out]"
      />
      <div className="absolute inset-0 bg-ink/30" />
      <div className="relative h-full flex flex-col items-center justify-center text-center text-canvas px-6">
        <p className="eyebrow fade-up" style={{ animationDelay: '0.3s' }}>
          {t('home.hero.eyebrow')}
        </p>
        <h1
          className="font-display text-5xl md:text-7xl lg:text-8xl mt-4 max-w-4xl leading-[1.05] fade-up"
          style={{ animationDelay: '0.45s' }}
        >
          {t('home.hero.title')}
        </h1>
        <p className="mt-6 max-w-sm text-sm text-canvas/80 fade-up" style={{ animationDelay: '0.65s' }}>
          {t('home.hero.support')}
        </p>
        <div className="fade-up" style={{ animationDelay: '0.85s' }}>
          <Button to="/shop" variant="onDark" size="lg" className="mt-10">
            {t('home.hero.cta')}
          </Button>
        </div>
      </div>
    </section>
  );
}

function Editorial() {
  const { t } = useLocale();
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
      <Reveal>
        <img src={media.editorialLeft} alt="" className="w-full aspect-[4/5] object-cover" />
      </Reveal>
      <Reveal delay={0.1} className="md:pl-10">
        <p className="eyebrow text-stone">{t('home.house.eyebrow')}</p>
        <h2 className="font-display text-4xl md:text-5xl mt-4 mb-6 leading-tight">{t('home.house.title')}</h2>
        <p className="text-stone leading-relaxed max-w-md">{t('home.house.body')}</p>
        <Link to="/shop" className="inline-block mt-8 eyebrow link-underline">
          {t('home.house.cta')}
        </Link>
      </Reveal>
    </section>
  );
}

function CategoryBands() {
  const { t } = useLocale();
  const bands = [
    { slug: 'bags', label: t('nav.bags'), img: media.bands.bags },
    { slug: 'watches', label: t('nav.watches'), img: media.bands.watches },
    { slug: 'apparel', label: t('nav.apparel'), img: media.bands.apparel },
  ];
  return (
    <section>
      {bands.map((b, i) => (
        <Reveal key={b.slug} as="div">
          <Link
            to={`/shop?category=${b.slug}`}
            className="group relative block h-[60vh] min-h-[380px] md:h-[70vh] w-full overflow-hidden"
          >
            <img
              src={b.img}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-ink/25 group-hover:bg-ink/35 transition-colors duration-500" />
            <div className="relative h-full flex flex-col items-center justify-center text-canvas">
              <p className="eyebrow">{`0${i + 1}`}</p>
              <h3 className="font-display text-5xl md:text-6xl mt-2">{b.label}</h3>
              <span className="mt-6 eyebrow link-underline">{t('home.band.shop', { cat: b.label })}</span>
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
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <Reveal className="text-center mb-12 md:mb-16">
        <p className="eyebrow text-stone">{t('home.featured.eyebrow')}</p>
        <h2 className="font-display text-4xl md:text-5xl mt-3">{t('home.featured.title')}</h2>
      </Reveal>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-14">
        {items.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.06}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Atelier() {
  const { t } = useLocale();
  return (
    <section className="relative">
      <img src={resizeUnsplash(media.atelier, 2000)} alt="" className="h-[65vh] md:h-[80vh] w-full object-cover" />
      <div className="absolute inset-0 bg-ink/40" />
      <Reveal className="absolute inset-0 flex flex-col items-center justify-center text-center text-canvas px-6">
        <p className="eyebrow">{t('home.atelier.eyebrow')}</p>
        <h2 className="font-display text-4xl md:text-6xl mt-4 max-w-3xl leading-tight">{t('home.atelier.title')}</h2>
        <p className="mt-6 max-w-lg text-canvas/80 leading-relaxed">{t('home.atelier.body')}</p>
      </Reveal>
    </section>
  );
}

export default function Home() {
  return (
    <div className="bg-canvas">
      <Hero />
      <Editorial />
      <CategoryBands />
      <Featured />
      <Atelier />
    </div>
  );
}
