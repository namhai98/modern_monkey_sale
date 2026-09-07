import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import client from '../api/client';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import { resizeUnsplash } from '../lib/media';

const ease = [0.22, 1, 0.36, 1];

const CATEGORY_COPY = {
  bags: [
    {
      title: 'Dimensions & capacity',
      body: 'Approx. 32 × 26 × 14 cm. Fits a 13-inch laptop, an A5 notebook and the day’s essentials. Interior slip pocket and key leash.',
    },
    {
      title: 'Craftsmanship',
      body: 'Cut from a single hide, saddle-stitched by hand and finished with hot-burnished edges. Each bag carries the mark of the artisan who made it.',
    },
  ],
  watches: [
    {
      title: 'Specifications',
      body: '40 mm stainless steel case · Sapphire crystal, anti-reflective · In-house automatic movement, 42h reserve · Water resistant to 50 m · Alligator strap with folding clasp.',
    },
    {
      title: 'Service',
      body: 'Recommended service every 4–5 years. Two-year international warranty. Complimentary strap fitting at any boutique.',
    },
  ],
  apparel: [
    {
      title: 'Size & fit',
      body: 'Cut for a relaxed, straight silhouette. The model is 186 cm and wears a size M. Between sizes? Take the smaller for a closer fit.',
    },
    {
      title: 'Materials & care',
      body: 'Double-faced cashmere, woven in Italy. Dry clean only. Store folded, away from light. A cashmere comb keeps the surface clear.',
    },
  ],
};

function Accordion({ title, body, open, onToggle }) {
  return (
    <div className="border-b border-line">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left eyebrow"
      >
        {title}
        <span className="text-stone text-base">{open ? '–' : '+'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-stone leading-relaxed text-sm max-w-md">{body}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [openSection, setOpenSection] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const { openCart } = useUI();

  useEffect(() => {
    setProduct(null);
    setNotFound(false);
    setQty(1);
    window.scrollTo({ top: 0 });
    client
      .get(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      });
  }, [id]);

  useEffect(() => {
    if (!product?.category?.slug) return;
    client
      .get('/products', { params: { category: product.category.slug, limit: 5 } })
      .then((res) => setRelated(res.data.items.filter((p) => p.id !== product.id).slice(0, 4)))
      .catch(() => {});
  }, [product]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-32 text-center">
        <h1 className="font-display text-3xl">No longer available</h1>
        <Link to="/shop" className="inline-block mt-6 eyebrow link-underline">
          Return to the collection
        </Link>
      </div>
    );
  }
  if (!product) {
    return <div className="max-w-3xl mx-auto px-6 py-32 text-center text-stone">Loading…</div>;
  }

  const soldOut = product.stock <= 0;
  const sections = [
    { title: 'Description', body: product.description || 'A considered piece from the Maison.' },
    ...(CATEGORY_COPY[product.category?.slug] || [
      {
        title: 'Materials & care',
        body: 'Made from carefully sourced materials. Handle with care to preserve its finish.',
      },
    ]),
    {
      title: 'Shipping & returns',
      body: 'Complimentary insured delivery in a signature box. Returns accepted within 14 days, unworn and in original packaging.',
    },
  ];

  function addToBag() {
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCart();
    }, 400);
  }

  return (
    <div className="bg-canvas">
      <div className="lg:grid lg:grid-cols-[58%_42%]">
        {/* gallery */}
        <div className="bg-ivory">
          <button
            onClick={() => product.image_url && setZoom(true)}
            className="block w-full cursor-zoom-in"
            aria-label="Zoom image"
          >
            {product.image_url ? (
              <img
                src={resizeUnsplash(product.image_url, 1400)}
                alt={product.name}
                className="w-full h-full object-cover lg:min-h-[100vh]"
              />
            ) : (
              <div className="aspect-square flex items-center justify-center">
                <span className="font-display text-6xl text-mist">MM</span>
              </div>
            )}
          </button>
        </div>

        {/* info */}
        <div className="px-6 md:px-14 py-16 lg:py-24">
          <div className="lg:sticky lg:top-28">
            {product.category && (
              <Link
                to={`/shop?category=${product.category.slug}`}
                className="eyebrow text-stone link-underline"
              >
                {product.category.name}
              </Link>
            )}
            <h1 className="font-display text-4xl md:text-5xl mt-4 leading-tight">{product.name}</h1>
            <p className="text-lg text-stone mt-4">
              ${Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>

            <div className="mt-10 flex items-stretch gap-3">
              <div className="inline-flex items-center border border-line">
                <button
                  className="px-4 text-stone hover:text-ink"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="px-3 tabular-nums text-sm">{qty}</span>
                <button
                  className="px-4 text-stone hover:text-ink"
                  onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <button
                onClick={addToBag}
                disabled={soldOut}
                className="flex-1 h-12 bg-ink text-canvas eyebrow border border-ink hover:bg-canvas hover:text-ink transition-colors duration-500 disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-canvas"
              >
                {soldOut ? 'Sold out' : added ? 'Added' : 'Add to bag'}
              </button>
            </div>

            {!soldOut && product.low_stock && (
              <p className="mt-4 text-xs text-stone">Only a few remain.</p>
            )}

            <div className="mt-14">
              {sections.map((s, i) => (
                <Accordion
                  key={s.title + i}
                  title={s.title}
                  body={s.body}
                  open={openSection === i}
                  onToggle={() => setOpenSection(openSection === i ? -1 : i)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-28">
          <Reveal className="text-center mb-14">
            <p className="eyebrow text-stone">You may also like</p>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {zoom && (
          <motion.div
            className="fixed inset-0 z-50 bg-ink/95 flex items-center justify-center p-6 cursor-zoom-out"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(false)}
          >
            <img
              src={resizeUnsplash(product.image_url, 2000)}
              alt={product.name}
              className="max-h-full max-w-full object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
