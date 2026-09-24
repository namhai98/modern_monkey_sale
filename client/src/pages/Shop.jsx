import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import ProductCard from '../components/ProductCard';
import CollectionCard from '../components/CollectionCard';
import Reveal from '../components/Reveal';
import Section from '../components/Section';
import SectionHeading from '../components/SectionHeading';
import PageHero from '../components/PageHero';
import Select from '../components/Select';
import Icon from '../components/Icon';
import Breadcrumb from '../components/Breadcrumb';
import { ProductGridSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import { media, resizeUnsplash } from '../lib/media';
import { useLocale } from '../context/LocaleContext';
import { categoryLabel } from '../lib/i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const LIMIT = 15;
const DEFAULT_SORT = 'created_at:desc';

function categoryImage(slug) {
  return media.bands[slug] || media.editorialRight;
}

/* The presentation site has no filters, no sort and no pagination anywhere —
   its own spec says to build them out of the existing vocabulary rather than
   invent a new one. So everything below is assembled from three house parts:
   the gold eyebrow, micro-type at 0.28em, and the hairline that turns gold when
   something is active. No filled pills, no radius, no shadows. */

/* A selectable chip: hairline by default, gold rule and gold text when on. */
function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`micro shrink-0 border px-3.5 py-2 tracking-[0.2em] transition-colors duration-300 ${
        active
          ? 'border-gold text-gold'
          : 'border-line text-muted hover:border-gold/50 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

/* A collapsible rail section: label left, −/+ right, a hairline underneath.
   Open by default — a filter a shopper cannot see is a filter they will not
   use; the toggle is there to get a long list out of the way, not to hide the
   rail's contents on arrival. */
function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line py-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-left transition-colors duration-300 hover:text-gold"
      >
        <span className="micro text-foreground">{title}</span>
        <Icon name={open ? 'minus' : 'plus'} className="h-3.5 w-3.5 shrink-0 text-muted" />
      </button>
      {open && <div className="mt-5">{children}</div>}
    </div>
  );
}

/* The filter rail body — shared by the desktop column and the mobile drawer.
   Category is NOT here: it runs along the top of the page as its own bar, the
   way the reference layout arranges it, so the rail is left to the refinements
   that narrow a category rather than choose one. */
function FilterControls({ t, brand, gender, sale, facets, patch }) {
  const row = (active) =>
    `flex w-full items-center gap-3 py-1.5 text-left text-sm transition-colors duration-300 ${
      active ? 'text-gold' : 'text-muted hover:text-foreground'
    }`;
  // A 1px rule rather than a dot — the same hairline signal used everywhere else.
  const rule = (on) => (
    <span
      aria-hidden="true"
      className={`h-px shrink-0 transition-all duration-300 ${on ? 'w-5 bg-gold' : 'w-2.5 bg-line'}`}
    />
  );

  return (
    <div>
      <div className="flex items-center gap-2.5 border-b border-line pb-4">
        <Icon name="filter" className="h-4 w-4 text-gold" />
        <span className="micro tracking-[0.32em] text-foreground">{t('shop.filters')}</span>
      </div>

      <FilterSection title={t('shop.offers')}>
        <button
          type="button"
          onClick={() => patch({ sale: sale ? '' : '1' })}
          aria-pressed={sale}
          className={row(sale)}
        >
          {rule(sale)}
          {t('filter.onSale')}
        </button>
      </FilterSection>

      {facets.genders.length > 0 && (
        <FilterSection title={t('filter.gender')}>
          <div className="flex flex-wrap gap-2">
            <Chip active={gender === ''} onClick={() => patch({ gender: '' })}>
              {t('filter.all')}
            </Chip>
            {facets.genders.map((g) => (
              <Chip
                key={g.value}
                active={gender === g.value}
                onClick={() => patch({ gender: g.value })}
              >
                {t(`gender.${g.value}`)}
              </Chip>
            ))}
          </div>
        </FilterSection>
      )}

      {facets.brands.length > 0 && (
        <FilterSection title={t('filter.brand')}>
          <div className="flex flex-wrap gap-2">
            <Chip active={brand === ''} onClick={() => patch({ brand: '' })}>
              {t('filter.all')}
            </Chip>
            {facets.brands.map((b) => (
              <Chip key={b.slug} active={brand === b.slug} onClick={() => patch({ brand: b.slug })}>
                {b.name}
              </Chip>
            ))}
          </div>
        </FilterSection>
      )}

      {(brand || gender || sale) && (
        <button
          type="button"
          onClick={() => patch({ brand: '', gender: '', sale: '' })}
          className="link-lux micro mt-6 text-gold"
        >
          {t('shop.clear')}
        </button>
      )}
    </div>
  );
}

/* The category bar: the listing's top-level choice, running the full width of
   the page above everything else. It scrolls horizontally rather than wrapping,
   so a shop with many categories keeps its first row intact on a phone. */
function CategoryBar({ t, locale, categories, category, onAll, patch }) {
  const item = (active) =>
    `link-lux font-catalog shrink-0 whitespace-nowrap py-1 text-[0.7rem] font-medium uppercase tracking-[0.22em] transition-colors duration-300 ${
      active ? 'text-gold' : 'text-muted hover:text-foreground'
    }`;

  return (
    <nav aria-label={t('shop.category')} className="border-b border-line">
      <div className="container-bar flex items-center gap-7 overflow-x-auto py-4 lg:gap-9">
        <button
          type="button"
          onClick={() => patch({ category: '', brand: '', gender: '', all: '1' })}
          className={item(category === '' && onAll)}
        >
          {t('nav.all')}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => patch({ category: c.slug, brand: '', gender: '', all: '' })}
            className={item(c.slug === category)}
          >
            {categoryLabel(locale, c)}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* "All" landing: pick a collection, or search. */
function CategoryChooser({ categories }) {
  const { t, locale } = useLocale();
  useDocumentTitle(t('shop.collection'));
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  function submit(e) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop?all=1');
  }

  return (
    <>
      <PageHero
        eyebrow={t('shop.allPieces')}
        title={t('shop.collection')}
        lead={t('shop.choose')}
        image={resizeUnsplash(media.hero, 2000)}
        crumbs={[{ label: t('shop.collection') }]}
      >
        <form onSubmit={submit} className="mt-10 max-w-md">
          <label htmlFor="shop-search" className="micro mb-2 block text-white/55">
            {t('shop.search')}
          </label>
          <input
            id="shop-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('shop.search')}
            className="w-full border-b border-white/25 bg-transparent py-3 text-sm text-white transition-colors duration-300 placeholder:text-white/35 focus:border-gold focus:outline-none"
          />
        </form>
        <div className="mt-8 flex flex-wrap gap-5">
          <Button to="/shop?all=1">{t('shop.everything')}</Button>
          <Button to="/shop?sale=1" variant="outline">
            {t('nav.sale')}
          </Button>
        </div>
      </PageHero>

      <Section>
        <SectionHeading
          eyebrow={t('home.collections.eyebrow')}
          title={t('home.collections.title')}
          align="center"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:mt-16 lg:grid-cols-3">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.1} className={i % 2 === 1 ? 'lg:mt-12' : ''}>
              <CollectionCard
                to={`/shop?category=${c.slug}`}
                label={categoryLabel(locale, c)}
                index={i}
                image={resizeUnsplash(categoryImage(c.slug), 1200)}
                meta={t('shop.pieces', { n: c.product_count })}
              />
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}

/* Listing: a filter rail and a grid, with every control's state living in the
   URL. None of that logic changed here — only what it looks like. */
function Listing({ categories }) {
  const { t, locale } = useLocale();
  const [params, setParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const brand = params.get('brand') || '';
  const gender = params.get('gender') || '';
  const sale = params.get('sale') === '1';
  // Drives the category bar's "All" state — the listing is the all view when no
  // category is chosen and ?all=1 is what brought us here.
  const onAll = params.get('all') === '1';
  const sort = params.get('sort') || DEFAULT_SORT;
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState({ brands: [], genders: [] });
  const [loading, setLoading] = useState(true);
  // Whether a result has ever landed. It separates "the page is still empty"
  // from "this filter refines a list already on screen" — the first deserves a
  // skeleton, the second must never take the grid away.
  const [loaded, setLoaded] = useState(false);
  const requestRef = useRef(0);
  const gridRef = useRef(null);
  // True only while the very first grid is being painted. The first list to
  // appear on an empty page earns its staggered entrance; every list after it
  // is a refinement of something already on screen and must simply be there.
  const firstPaint = useRef(true);

  const activeCat = categories.find((c) => c.slug === category);

  // One writer for every control. Any change but `page` returns to page 1.
  const patch = useCallback(
    (changes) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v === '' || v == null) next.delete(k);
          else next.set(k, String(v));
        }
        if (!('page' in changes)) next.delete('page');
        return next;
      });
    },
    [setParams]
  );

  // Debounced search box — mirrors ?q= but doesn't hammer history on each keypress
  const [qDraft, setQDraft] = useState(q);
  useEffect(() => {
    setQDraft(q);
  }, [q]);
  useEffect(() => {
    if (qDraft.trim() === q) return undefined;
    const id = setTimeout(() => patch({ q: qDraft.trim() }), 300);
    return () => clearTimeout(id);
  }, [qDraft, q, patch]);

  // Lock body scroll while the mobile filter drawer is open, and put the
  // shopper back where they were when it closes. overflow:hidden alone collapses
  // the scrollable area and loses the position — which used to go unnoticed
  // because every filter change scrolled to the top regardless. The fixed-body
  // approach is the same one the navbar menu uses, and it is the one iOS Safari
  // actually honours.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const scrollY = window.scrollY;
    const { style } = document.body;
    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
    style.overflow = 'hidden';
    return () => {
      style.position = '';
      style.top = '';
      style.left = '';
      style.right = '';
      style.width = '';
      style.overflow = '';
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  }, [drawerOpen]);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setDrawerOpen(false);
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    mq.addEventListener('change', onChange);
    window.addEventListener('keydown', onKey);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const SORTS = useMemo(
    () => [
      { value: 'created_at:desc', label: t('sort.newest') },
      { value: 'price:asc', label: t('sort.priceAsc') },
      { value: 'price:desc', label: t('sort.priceDesc') },
      { value: 'name:asc', label: t('sort.name') },
    ],
    [t]
  );

  useEffect(() => {
    client
      .get('/products/facets', {
        params: {
          ...(category ? { category } : {}),
          ...(q ? { search: q } : {}),
          ...(sale ? { on_sale: 1 } : {}),
        },
      })
      .then((res) => setFacets(res.data))
      .catch(() => setFacets({ brands: [], genders: [] }));
  }, [category, q, sale]);

  useEffect(() => {
    const [field, order] = sort.split(':');
    // Two filter clicks in quick succession start two requests, and they can
    // land out of order — the first one back is not necessarily the one asked
    // for last. Only the newest request is allowed to write state.
    const request = (requestRef.current += 1);
    setLoading(true);
    client
      .get('/products', {
        params: {
          ...(category ? { category } : {}),
          ...(q ? { search: q } : {}),
          ...(brand ? { brand } : {}),
          ...(gender ? { gender } : {}),
          ...(sale ? { on_sale: 1 } : {}),
          sort: field,
          order,
          page,
          limit: LIMIT,
        },
      })
      .then((res) => {
        if (request !== requestRef.current) return;
        setProducts(res.data.items);
        setTotal(res.data.total);
        setLoaded(true);
      })
      .catch(() => {
        // Leave the list a shopper is reading on screen rather than blanking it
        // over a dropped request; the next filter change retries.
      })
      .finally(() => {
        if (request === requestRef.current) setLoading(false);
      });
  }, [category, q, brand, gender, sale, sort, page]);

  // Runs after the render in which `loaded` first turns true — so that render,
  // the one that paints the first grid, still sees firstPaint.current === true.
  useEffect(() => {
    if (loaded) firstPaint.current = false;
  }, [loaded]);

  // Paging is the one control where holding the scroll position is wrong: you
  // ask for the next page from the bottom of this one, and want its top.
  useEffect(() => {
    if (!loaded) return;
    gridRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const heading = activeCat
    ? categoryLabel(locale, activeCat)
    : q
    ? `“${q}”`
    : sale && !category
    ? t('nav.sale')
    : t('shop.collection');
  useDocumentTitle(heading);
  const activeCount = (brand ? 1 : 0) + (gender ? 1 : 0) + (sale ? 1 : 0);
  const controlProps = { t, locale, categories, category, brand, gender, sale, facets, patch };

  const crumbs = [{ label: t('shop.collection'), to: '/shop' }];
  if (activeCat || q || sale) crumbs.push({ label: heading });

  return (
    <>
      {/* The listing is arranged as a working browse page rather than an
          editorial opener: category bar across the top, breadcrumb, then the
          filter rail and the grid side by side — all on the full-bleed rail so
          a wide screen is spent on products. The house vocabulary is unchanged
          throughout: micro type at 0.28em, gold for what is active, hairlines
          for every division, no pills, no radius, no shadows. */}
      <CategoryBar
        t={t}
        locale={locale}
        categories={categories}
        category={category}
        onAll={onAll}
        patch={patch}
      />

      <div className="container-bar py-5">
        <Breadcrumb items={crumbs} />
      </div>

      <div className="container-bar pb-16 md:pb-24">
        <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10 xl:grid-cols-[17rem_1fr] xl:gap-14">
          <aside className="hidden lg:block">
            {/* The rule between rail and grid is the same hairline the rest of
                the page divides with. */}
            <div className="sticky top-28 lg:border-r lg:border-line lg:pr-8 xl:pr-10">
              <FilterControls {...controlProps} />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-8 border-b border-line pb-5">
              {/* Stacked below lg and spread across one line above it. Left to
                  wrap, the count, the search field and the two controls land in
                  three ragged rows on a phone. */}
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
                {/* The result count is the page's heading here — it is the one
                    fact a shopper checks after every filter. */}
                <h1 className="heading-serif shrink-0 text-xl text-foreground md:text-2xl">
                  {t('shop.pieces', { n: total })}
                </h1>

                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6 lg:flex-1 lg:justify-end">
                <div className="relative min-w-0 sm:flex-1 sm:max-w-sm">
                  <label htmlFor="listing-search" className="micro mb-1 block text-muted">
                    {t('shop.search')}
                  </label>
                  <input
                    id="listing-search"
                    value={qDraft}
                    onChange={(e) => setQDraft(e.target.value)}
                    placeholder={t('shop.search')}
                    className="field pr-7"
                  />
                  {qDraft && (
                    <button
                      type="button"
                      onClick={() => {
                        setQDraft('');
                        patch({ q: '' });
                      }}
                      aria-label={t('shop.clear')}
                      className="absolute bottom-3 right-0 text-muted transition-colors hover:text-gold"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="flex shrink-0 items-end justify-between gap-5 sm:justify-start">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="micro inline-flex items-center gap-1.5 border-b border-line py-3 transition-colors duration-300 hover:border-gold hover:text-gold lg:hidden"
                  >
                    <Icon name="filter" className="h-3.5 w-3.5" />
                    {t('shop.filters')}
                    {activeCount > 0 && <span className="text-gold">({activeCount})</span>}
                  </button>
                  <div className="w-40">
                    <label htmlFor="listing-sort" className="micro mb-1 block text-muted">
                      {t('shop.sortBy')}
                    </label>
                    <Select
                      id="listing-sort"
                      value={sort}
                      onChange={(e) =>
                        patch({ sort: e.target.value === DEFAULT_SORT ? '' : e.target.value })
                      }
                    >
                      {SORTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                </div>
              </div>
            </div>

            {/* The skeleton is for a page that has nothing yet — the first
                load. Once a list is on screen a filter change refines it in
                place: the same grid element stays mounted, cards keep their
                DOM nodes (and therefore their decoded images) wherever the id
                survives the filter, and the whole block simply dims while the
                new set is on its way. Swapping the grid out for a skeleton is
                what made it blink, and it took the scroll position with it. */}
            <div ref={gridRef} className="scroll-mt-32">
              {!loaded ? (
                <ProductGridSkeleton />
              ) : products.length === 0 ? (
                <EmptyState
                  inline
                  eyebrow={t('shop.collection')}
                  title={q ? t('search.none', { q }) : t('shop.empty')}
                  body={t('shop.emptyHint')}
                  actions={
                    <Button
                      variant="outline-dark"
                      onClick={() => patch({ q: '', brand: '', gender: '', sale: '', category: '', all: '1' })}
                    >
                      {t('shop.everything')}
                    </Button>
                  }
                />
              ) : (
                <div
                  aria-busy={loading}
                  /* A fifth column past 1700px: the page is full-bleed now, so
                     on a wide monitor the extra width goes to products rather
                     than to margins. In rem, not px — Tailwind sorts breakpoint
                     media queries by raw number, so a px value lands before the
                     rem-based xl and loses to it. 106.25rem = 1700px. */
                  className={`grid grid-cols-2 gap-x-6 gap-y-12 transition-opacity duration-300 ease-[var(--ease-luxe)] md:grid-cols-3 md:gap-y-16 xl:grid-cols-4 min-[106.25rem]:grid-cols-5 ${
                    loading ? 'opacity-45' : 'opacity-100'
                  }`}
                >
                  {products.map((p, i) => (
                    /* startShown once a list exists: a card arriving as part of
                       a refine should be there, not rise from opacity 0 —
                       that fade was the second half of the flicker. The very
                       first paint keeps its staggered entrance. */
                    <Reveal key={p.id} delay={(i % 4) * 0.06} startShown={!firstPaint.current}>
                      <ProductCard product={p} />
                    </Reveal>
                  ))}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-16 flex items-center justify-center gap-8 border-t border-line pt-10 md:mt-24">
                <button
                  onClick={() => patch({ page: page > 2 ? page - 1 : '' })}
                  disabled={page <= 1}
                  className="link-lux micro text-muted transition-colors hover:text-gold disabled:pointer-events-none disabled:opacity-30"
                >
                  {t('shop.prev')}
                </button>
                <span className="micro tabular-nums">
                  <span className="text-gold">{page}</span>
                  <span className="text-muted"> / {totalPages}</span>
                </span>
                <button
                  onClick={() => patch({ page: page + 1 })}
                  disabled={page >= totalPages}
                  className="link-lux micro text-muted transition-colors hover:text-gold disabled:pointer-events-none disabled:opacity-30"
                >
                  {t('shop.next')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer — ink scrim plus blur, panel held by a hairline. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 animate-[fadeIn_0.25s_ease-out] bg-ink/80 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('shop.filters')}
            className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col border-r border-line bg-background"
          >
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-line px-6">
              <span className="eyebrow">{t('shop.filters')}</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="link-lux micro text-muted transition-colors hover:text-gold"
                aria-label={t('nav.close')}
              >
                {t('nav.close')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-8">
              <FilterControls {...controlProps} />
            </div>
            <div className="shrink-0 border-t border-line p-5">
              <Button full onClick={() => setDrawerOpen(false)}>
                {t('shop.pieces', { n: total })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Shop() {
  const [params] = useSearchParams();
  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const all = params.get('all') === '1';
  const sale = params.get('sale') === '1';
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    client
      .get('/categories')
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  if (!category && !q && !all && !sale) return <CategoryChooser categories={categories} />;
  return <Listing categories={categories} />;
}
