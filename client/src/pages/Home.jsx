import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import { media, resizeUnsplash } from '../lib/media';

const ease = [0.22, 1, 0.36, 1];

function Hero() {
  return (
    <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden">
      <motion.img
        src={media.hero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.6, ease }}
      />
      <div className="absolute inset-0 bg-ink/30" />
      <div className="relative h-full flex flex-col items-center justify-center text-center text-canvas px-6">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease }}
        >
          The Autumn Collection
        </motion.p>
        <motion.h1
          className="font-display text-5xl md:text-7xl lg:text-8xl mt-4 max-w-4xl leading-[1.05]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.55, ease }}
        >
          Made to be kept
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
        >
          <Link
            to="/shop"
            className="inline-block mt-10 border border-canvas/70 px-10 py-4 eyebrow hover:bg-canvas hover:text-ink transition-colors duration-500"
          >
            Discover
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function Editorial() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-28 grid md:grid-cols-2 gap-16 items-center">
      <Reveal>
        <img src={media.editorialLeft} alt="" className="w-full aspect-[4/5] object-cover" />
      </Reveal>
      <Reveal delay={0.1} className="md:pl-10">
        <p className="eyebrow text-stone">The House</p>
        <h2 className="font-display text-4xl md:text-5xl mt-4 mb-6 leading-tight">
          An object should outlast the season that made it.
        </h2>
        <p className="text-stone leading-relaxed max-w-md">
          Every piece is cut, stitched and finished by a small number of hands. We work in
          full-grain leathers, double-faced cashmere and Swiss movements — materials chosen
          because they age well, not because they photograph well.
        </p>
        <Link to="/shop" className="inline-block mt-8 eyebrow link-underline">
          Explore the collection
        </Link>
      </Reveal>
    </section>
  );
}

function CategoryBands() {
  const bands = [
    { slug: 'bags', label: 'Bags', img: media.bands.bags },
    { slug: 'watches', label: 'Watches', img: media.bands.watches },
    { slug: 'apparel', label: 'Apparel', img: media.bands.apparel },
  ];
  return (
    <section>
      {bands.map((b, i) => (
        <Reveal key={b.slug} as="div">
          <Link
            to={`/shop?category=${b.slug}`}
            className="group relative block h-[70vh] min-h-[420px] w-full overflow-hidden"
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
              <span className="mt-6 eyebrow link-underline">Shop {b.label}</span>
            </div>
          </Link>
        </Reveal>
      ))}
    </section>
  );
}

function Featured() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    client
      .get('/products', { params: { sort: 'created_at', order: 'desc', limit: 4 } })
      .then((res) => setItems(res.data.items))
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-6 py-28">
      <Reveal className="text-center mb-16">
        <p className="eyebrow text-stone">Newly Added</p>
        <h2 className="font-display text-4xl md:text-5xl mt-3">This week at the Maison</h2>
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
  return (
    <section className="relative">
      <img src={resizeUnsplash(media.atelier, 2000)} alt="" className="h-[80vh] w-full object-cover" />
      <div className="absolute inset-0 bg-ink/40" />
      <Reveal className="absolute inset-0 flex flex-col items-center justify-center text-center text-canvas px-6">
        <p className="eyebrow">Craftsmanship</p>
        <h2 className="font-display text-4xl md:text-6xl mt-4 max-w-3xl leading-tight">
          Forty hours to a single bag
        </h2>
        <p className="mt-6 max-w-lg text-canvas/80 leading-relaxed">
          From the first cut to the final burnished edge, our workshop moves at the pace the
          material asks for.
        </p>
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
