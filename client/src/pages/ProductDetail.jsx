import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client from '../api/client';
import Accordion from '../components/Accordion';
import Breadcrumb from '../components/Breadcrumb';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Price from '../components/Price';
import ProductRow from '../components/ProductRow';
import HeartButton from '../components/HeartButton';
import Icon from '../components/Icon';
import ProductGallery from '../components/ProductGallery';
import QuantityStepper from '../components/QuantityStepper';
import RecentlyViewed from '../components/RecentlyViewed';
import Section from '../components/Section';
import { RowHeading } from '../components/SectionHeading';
import SizeGuide from '../components/SizeGuide';
import StickyBuyBar from '../components/StickyBuyBar';
import { ProductDetailSkeleton } from '../components/Skeleton';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { useUI } from '../context/UIContext';
import { categoryLabel } from '../lib/i18n';
import { isDiscounted, useMoney } from '../lib/price';
import { recordView } from '../lib/recent';
import { site } from '../lib/site';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function ProductDetail() {
  const { id } = useParams();
  const { t, locale } = useLocale();
  const money = useMoney();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  // Any other failure (offline, server down): say so and offer a retry
  // instead of leaving the skeleton up forever.
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState(null);
  const [openSection, setOpenSection] = useState(0);
  const [added, setAdded] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  // The add-to-bag row (watched by the phone's sticky buy bar) and the size
  // picker (where that bar sends a shopper who has not chosen one yet).
  const buyRowRef = useRef(null);
  const sizesRef = useRef(null);
  const { addItem } = useCart();
  const { openCart } = useUI();
  const { success } = useToast();
  useDocumentTitle(product?.name);

  useEffect(() => {
    setProduct(null);
    setNotFound(false);
    setFailed(false);
    setRelated([]); // the previous piece's rail must not linger under this one
    setQty(1);
    setVariantId(null);
    window.scrollTo({ top: 0 });
    client
      .get(`/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        recordView(res.data.id);
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
        else setFailed(true);
      });
  }, [id, attempt]);

  useEffect(() => {
    if (!product?.category?.slug) return;
    client
      .get('/products', { params: { category: product.category.slug, limit: 5 } })
      .then((res) => setRelated(res.data.items.filter((p) => p.id !== product.id).slice(0, 4)))
      .catch(() => { });
  }, [product]);

  if (notFound) {
    return (
      <EmptyState
        eyebrow="404"
        title={t('pdp.gone')}
        actions={<Button to="/shop?all=1">{t('pdp.backToCollection')}</Button>}
      />
    );
  }
  if (failed) {
    return (
      <EmptyState
        eyebrow={t('common.loadFailedEyebrow')}
        title={t('common.loadFailed')}
        actions={
          <>
            <Button onClick={() => setAttempt((n) => n + 1)}>{t('common.retry')}</Button>
            <Button to="/shop?all=1" variant="outline-dark">
              {t('pdp.backToCollection')}
            </Button>
          </>
        }
      />
    );
  }
  if (!product) return <ProductDetailSkeleton />;

  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  const selectedVariant = variants.find((v) => v.id === variantId) || null;
  const soldOut = hasVariants ? variants.every((v) => v.stock <= 0) : product.stock <= 0;
  const needsSize = hasVariants && !selectedVariant;
  const maxQty = hasVariants ? selectedVariant?.stock || 1 : product.stock || 1;
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
    if (needsSize) return;
    addItem(product, qty, selectedVariant);
    setAdded(true);
    success(t('cart.added'));
    setTimeout(() => {
      setAdded(false);
      openCart();
    }, 400);
  }

  const crumbs = [{ label: t('shop.collection'), to: '/shop' }];
  if (product.category) {
    crumbs.push({
      label: categoryLabel(locale, product.category),
      to: `/shop?category=${product.category.slug}`,
    });
  }
  crumbs.push({ label: product.name });

  return (
    <>
      {/* Full-bleed like the header and the gallery/info split below it, so
          the trail starts on the header's left edge instead of floating in a
          centred column on wide screens. */}
      <div className="container-bar py-5">
        <Breadcrumb items={crumbs} className="hdr:ml-2" />
      </div>

      <div className="lg:grid lg:grid-cols-[58%_42%] lg:items-start">
        <div className="bg-surface pb-4 lg:sticky lg:top-20 lg:pb-6">
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

        <div className="px-6 py-12 md:px-12 md:py-16 lg:py-14">
          <div className="lg:sticky lg:top-28">
            {/* Meta row — brand and category as micro-type links, the
                tracking ladder's 0.28em step. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {product.brand && (
                <Link
                  to={`/shop?all=1&brand=${product.brand.slug}`}
                  className="link-lux micro text-gold"
                >
                  {product.brand.name}
                </Link>
              )}
              {product.category && (
                <Link
                  to={`/shop?category=${product.category.slug}`}
                  className="link-lux font-catalog text-meta uppercase tracking-meta text-muted transition-colors hover:text-gold"
                >
                  {categoryLabel(locale, product.category)}
                </Link>
              )}
              {product.gender && (
                <span className="micro text-muted">{t(`gender.${product.gender}`)}</span>
              )}
            </div>

            <h1 className="font-catalog mt-5 text-pdp font-medium">
              {product.name}
            </h1>

            <div className="mt-6">
              <Price product={product} size="lg" showPercent />
              {isDiscounted(product) && (
                <p className="micro mt-3 tracking-meta text-gold">
                  {t('price.save', { amount: money(product.discount_amount) })}
                </p>
              )}
            </div>

            {hasVariants && (
              <div ref={sizesRef} className="mt-10 scroll-mt-[calc(var(--header-h)+1.5rem)]">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <p className="micro text-muted">{t('pdp.size')}</p>
                  {slug === 'apparel' && (
                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen(true)}
                      className="link-lux tap-area micro tracking-meta text-muted hover:text-gold"
                    >
                      {t('sizeGuide.link')}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const out = v.stock <= 0;
                    const active = v.id === variantId;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={out}
                        onClick={() => {
                          setVariantId(v.id);
                          setQty((q) => Math.min(Math.max(1, q), v.stock || 1));
                        }}
                        aria-pressed={active}
                        className={`min-w-12 border px-4 py-2.5 text-sm transition-colors duration-300 ${active
                          ? 'border-gold text-gold'
                          : out
                            ? 'cursor-not-allowed border-line text-muted/40 line-through'
                            : 'border-line text-foreground hover:border-gold/50 hover:text-gold'
                          }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No separate "choose a size" note under the sizes: the button
                below already says it, in the one place a shopper looks. */}
            <div ref={buyRowRef} className="mt-10 flex flex-wrap items-stretch gap-4">
              <QuantityStepper
                value={qty}
                max={maxQty}
                onChange={setQty}
                labels={{ decrease: t('cart.decrease'), increase: t('cart.increase') }}
              />
              <Button
                onClick={addToBag}
                disabled={soldOut || needsSize}
                size="lg"
                // A phone gives the button a row of its own under the stepper
                // and heart, so a long label like "Choose a size" stays on one line.
                className="order-last min-w-0 basis-full sm:order-none sm:basis-0 sm:flex-1"
              >
                {soldOut
                  ? t('product.soldOut')
                  : needsSize
                    ? t('pdp.selectSize')
                    : added
                      ? t('pdp.added')
                      : t('pdp.addToBag')}
              </Button>
              <HeartButton productId={product.id} variant="outline" />
            </div>

            {!soldOut && product.low_stock && (
              <p className="micro mt-5 tracking-meta text-gold">{t('pdp.fewRemain')}</p>
            )}

            {/* A question before buying goes straight to the boutique; the ref
                tells them which piece the conversation is about. */}
            <Button
              href={`${site.social.messenger}?ref=product-${product.id}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline-dark"
              full
              className="mt-6"
            >
              <Icon name="messageCircle" className="h-4 w-4" />
              {t('pdp.ask')}
            </Button>

            <div className="mt-14 border-t border-line">
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
        <Section tone="surface" pad="content">
          <RowHeading
            eyebrow={t('pdp.related')}
            action={
              product.category && (
                <Link
                  to={`/shop?category=${product.category.slug}`}
                  className="link-lux tap-area micro tracking-button text-gold"
                >
                  {t('shop.explore')}
                </Link>
              )
            }
          />
          <ProductRow products={related} cols="md:grid-cols-2 lg:grid-cols-4" className="mt-10 md:mt-14" />
        </Section>
      )}

      <StickyBuyBar
        watchRef={buyRowRef}
        product={product}
        soldOut={soldOut}
        needsSize={needsSize}
        added={added}
        onAdd={addToBag}
        onChooseSize={() => sizesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />

      {slug === 'apparel' && (
        <SizeGuide open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} highlight={selectedVariant?.label} />
      )}

      <RecentlyViewed excludeId={product.id} tone={related.length > 0 ? 'theme' : 'surface'} />
    </>
  );
}
