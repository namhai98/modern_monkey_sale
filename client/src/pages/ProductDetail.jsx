import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client from '../api/client';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { useLocale } from '../context/LocaleContext';
import { categoryLabel } from '../lib/i18n';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import ProductGallery from '../components/ProductGallery';
import Button from '../components/Button';
import { ProductDetailSkeleton } from '../components/Skeleton';

function Accordion({ title, body, open, onToggle }) {
  return (
    <div className="border-b border-line">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-5 text-left eyebrow"
      >
        {title}
        <span className="text-stone text-base">{open ? '–' : '+'}</span>
      </button>
      {/* CSS grid-rows collapse — content always in the DOM, never JS-gated */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="pb-6 text-stone leading-relaxed text-sm max-w-md">{body}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const { t, locale } = useLocale();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [openSection, setOpenSection] = useState(0);
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
        <h1 className="font-display text-3xl">{t('pdp.gone')}</h1>
        <Link to="/shop" className="inline-block mt-6 eyebrow link-underline">
          {t('pdp.backToCollection')}
        </Link>
      </div>
    );
  }
  if (!product) return <ProductDetailSkeleton />;

  const soldOut = product.stock <= 0;
  const slug = product.category?.slug;
  const categorySections =
    slug === 'bags'
      ? [
          { title: t('pdp.acc.dimensions'), body: t('pdp.body.bags.dimensions') },
          { title: t('pdp.acc.craftsmanship'), body: t('pdp.body.bags.craftsmanship') },
        ]
      : slug === 'watches'
      ? [
          { title: t('pdp.acc.specs'), body: t('pdp.body.watches.specs') },
          { title: t('pdp.acc.service'), body: t('pdp.body.watches.service') },
        ]
      : slug === 'apparel'
      ? [
          { title: t('pdp.acc.sizeFit'), body: t('pdp.body.apparel.sizeFit') },
          { title: t('pdp.acc.materials'), body: t('pdp.body.apparel.materials') },
        ]
      : [{ title: t('pdp.acc.materials'), body: t('pdp.body.materialsDefault') }];

  const sections = [
    { title: t('pdp.acc.description'), body: product.description || t('pdp.body.default') },
    ...categorySections,
    { title: t('pdp.acc.shipping'), body: t('pdp.body.shipping') },
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
      <div className="lg:grid lg:grid-cols-[58%_42%] lg:items-start">
        {/* gallery */}
        <div className="bg-ivory pb-4 lg:pb-6 lg:sticky lg:top-20">
          <ProductGallery
            images={
              product.images?.length
                ? product.images
                : product.image_url
                ? [{ detail: product.image_url, card: product.image_url, thumbnail: product.image_url }]
                : []
            }
            alt={product.name}
          />
        </div>

        {/* info */}
        <div className="px-6 md:px-14 py-12 md:py-16 lg:py-14">
          <div className="lg:sticky lg:top-24">
            <div className="flex items-center gap-3 flex-wrap">
              {product.brand && <span className="eyebrow text-ink">{product.brand}</span>}
              {product.category && (
                <Link to={`/shop?category=${product.category.slug}`} className="eyebrow text-stone link-underline">
                  {categoryLabel(locale, product.category)}
                </Link>
              )}
              {product.gender && (
                <span className="eyebrow text-stone">· {t(`gender.${product.gender}`)}</span>
              )}
            </div>
            <h1 className="font-display text-4xl md:text-5xl mt-4 leading-tight">{product.name}</h1>
            <p className="text-lg text-stone mt-4">
              ${Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>

            <div className="mt-10 flex items-stretch gap-3">
              <div className="inline-flex items-center border border-line">
                <button className="px-4 text-stone hover:text-ink" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="-">−</button>
                <span className="px-3 tabular-nums text-sm">{qty}</span>
                <button className="px-4 text-stone hover:text-ink" onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))} aria-label="+">+</button>
              </div>
              <Button
                onClick={addToBag}
                disabled={soldOut}
                size="lg"
                className="flex-1"
              >
                {soldOut ? t('product.soldOut') : added ? t('pdp.added') : t('pdp.addToBag')}
              </Button>
            </div>

            {!soldOut && product.low_stock && <p className="mt-4 text-xs text-stone">{t('pdp.fewRemain')}</p>}

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
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Reveal className="text-center mb-12 md:mb-14">
            <p className="eyebrow text-stone">{t('pdp.related')}</p>
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

    </div>
  );
}
