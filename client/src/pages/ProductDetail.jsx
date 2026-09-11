import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client from '../api/client';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import { categoryLabel } from '../lib/i18n';
import Reveal from '../components/Reveal';
import ProductCard from '../components/ProductCard';
import ProductGallery from '../components/ProductGallery';
import Button from '../components/Button';
import Breadcrumb from '../components/Breadcrumb';
import Price from '../components/Price';
import QuantityStepper from '../components/QuantityStepper';
import Section, { Container } from '../components/Section';
import { RowHeading } from '../components/SectionHeading';
import EmptyState from '../components/EmptyState';
import { ProductDetailSkeleton } from '../components/Skeleton';
import { useMoney, isDiscounted } from '../lib/price';
import { useDocumentTitle } from '../lib/useDocumentTitle';

/* A hairline-divided accordion — the same shape as the presentation site's FAQ:
   micro-type title, a +/– that rotates into an × as it opens, and the open row
   in gold. The body stays in the DOM and is collapsed with grid-template-rows,
   so it is always findable by in-page search and never JS-gated. */
function Accordion({ title, body, open, onToggle }) {
  return (
    <div className="border-b border-line">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`micro flex w-full items-center justify-between gap-4 py-5 text-left transition-colors duration-300 ${
          open ? 'text-gold' : 'text-foreground hover:text-gold'
        }`}
      >
        {title}
        <span
          aria-hidden="true"
          className={`shrink-0 text-base leading-none transition-transform duration-300 ${
            open ? 'rotate-45' : ''
          }`}
        >
          +
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="max-w-md pb-6 text-sm leading-relaxed text-muted">{body}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const { t, locale } = useLocale();
  const money = useMoney();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState(null);
  const [openSection, setOpenSection] = useState(0);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const { openCart } = useUI();
  const { success } = useToast();
  useDocumentTitle(product?.name);

  useEffect(() => {
    setProduct(null);
    setNotFound(false);
    setQty(1);
    setVariantId(null);
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
      <EmptyState
        eyebrow="404"
        title={t('pdp.gone')}
        actions={<Button to="/shop?all=1">{t('pdp.backToCollection')}</Button>}
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
      <Container className="py-5">
        <Breadcrumb items={crumbs} />
      </Container>

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
                  className="link-lux micro text-muted transition-colors hover:text-gold"
                >
                  {categoryLabel(locale, product.category)}
                </Link>
              )}
              {product.gender && (
                <span className="micro text-muted">{t(`gender.${product.gender}`)}</span>
            )}
            </div>

            <h1 className="heading-serif mt-5 text-4xl leading-[1.08] md:text-5xl">
              {product.name}
            </h1>

            <div className="mt-6">
              <Price product={product} size="lg" showPercent />
              {isDiscounted(product) && (
                <p className="micro mt-3 tracking-[0.22em] text-gold">
                  {t('price.save', { amount: money(product.discount_amount) })}
                </p>
              )}
            </div>

            {hasVariants && (
              <div className="mt-10">
                <p className="micro mb-4 text-muted">{t('pdp.size')}</p>
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
                        className={`min-w-12 border px-4 py-2.5 text-sm transition-colors duration-300 ${
                          active
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
                {needsSize && (
                  <p className="micro mt-4 text-muted">{t('pdp.selectSize')}</p>
                )}
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-stretch gap-4">
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
                className="min-w-0 flex-1"
              >
                {soldOut
                  ? t('product.soldOut')
                  : needsSize
                  ? t('pdp.selectSize')
                  : added
                  ? t('pdp.added')
                  : t('pdp.addToBag')}
              </Button>
            </div>

            {!soldOut && product.low_stock && (
              <p className="micro mt-5 tracking-[0.22em] text-gold">{t('pdp.fewRemain')}</p>
            )}

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
                  className="link-lux micro tracking-[0.3em] text-gold"
                >
                  {t('shop.explore')}
                </Link>
              )
            }
          />
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:mt-14 lg:grid-cols-4">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.08}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
