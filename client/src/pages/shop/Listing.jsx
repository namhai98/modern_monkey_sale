import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import client from '../../api/client';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import ProductCard from '../../components/ProductCard';
import Reveal from '../../components/Reveal';
import Select from '../../components/Select';
import SidePanel from '../../components/SidePanel';
import Skeleton, { ProductGridSkeleton } from '../../components/Skeleton';
import TextButton from '../../components/TextButton';
import { useLocale } from '../../context/LocaleContext';
import { categoryLabel } from '../../lib/i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { HEAD_ROW, HEAD_TEXT, usePriceUnits, FilterControls, ActiveFilters, FixedFilterRail } from './filters';
import { CategoryBar } from './CategoryBar';
import { readListMemory, writeListMemory } from './listMemory';

const LIMIT = 15;

const DEFAULT_SORT = 'created_at:desc';

/* Listing: a filter rail and a grid, with every control's state living in the
   URL. None of that logic changed here — only what it looks like. */
export function Listing({ categories }) {
  const { t, locale } = useLocale();
  const [params, setParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const brand = params.get('brand') || '';
  // Several brands at once, comma-separated in the URL.
  const brands = useMemo(() => brand.split(',').filter(Boolean), [brand]);
  const gender = params.get('gender') || '';
  const sale = params.get('sale') === '1';
  const inStock = params.get('stock') === '1';
  // Price bounds, in USD (what the catalogue is priced in).
  const numParam = (k) => {
    const n = Number(params.get(k));
    return params.get(k) && Number.isFinite(n) && n >= 0 ? n : null;
  };
  const pmin = numParam('pmin');
  const pmax = numParam('pmax');
  // Drives the category bar's "All" state — the listing is the all view when no
  // category is chosen and ?all=1 is what brought us here.
  const onAll = params.get('all') === '1';
  const sort = params.get('sort') || DEFAULT_SORT;
  // Back from a product: the list as it was left, cards and scroll position
  // (see listMemory.js). Matched on the history entry's key, so only a return
  // to this very entry restores it — a fresh visit (a new entry, or a first
  // load, which the router also reports as POP) starts from the first page.
  const location = useLocation();
  const [memory] = useState(() => readListMemory(params.toString(), location.key));
  // Pages load one under another as the shopper scrolls, so the page count is
  // the list's own state, not part of the URL.
  const [page, setPage] = useState(memory?.page ?? 1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef(null);
  // Cards at or past this index arrived with "load more" and make an entrance;
  // earlier ones are already on screen.
  const appendFrom = useRef(memory ? Infinity : 0);

  const [products, setProducts] = useState(memory?.products ?? []);
  const [total, setTotal] = useState(memory?.total ?? 0);
  const [facets, setFacets] = useState({ brands: [], genders: [], price: null });
  const [allFacets, setAllFacets] = useState({ brands: [], genders: [] });
  const [loading, setLoading] = useState(!memory);
  // Whether a result has ever landed. It separates "the page is still empty"
  // from "this filter refines a list already on screen" — the first deserves a
  // skeleton, the second must never take the grid away.
  const [loaded, setLoaded] = useState(Boolean(memory));
  const requestRef = useRef(0);
  // True only while the very first grid is being painted. The first list to
  // appear on an empty page earns its staggered entrance; every list after it
  // is a refinement of something already on screen and must simply be there.
  const firstPaint = useRef(!memory);

  const activeCat = categories.find((c) => c.slug === category);

  // One writer for every control. An old ?page= link is dropped — the list
  // now grows by scrolling instead.
  const patch = useCallback(
    (changes) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v === '' || v == null) next.delete(k);
          else next.set(k, String(v));
        }
        next.delete('page');
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
  // Widening past lg brings the fixed rail back, so the drawer closes itself.
  // (Escape, the scrim and the focus trap are SidePanel's.)
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setDrawerOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [drawerOpen]);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const SORTS = useMemo(
    () => [
      { value: 'created_at:desc', label: t('sort.newest') },
      { value: 'price:asc', label: t('sort.priceAsc') },
      { value: 'price:desc', label: t('sort.priceDesc') },
      { value: 'name:asc', label: t('sort.name') },
    ],
    [t]
  );

  // The category's full option list, independent of every other filter — the
  // rail lists these always and greys out the ones the selection lacks.
  useEffect(() => {
    client
      .get('/products/facets', { params: category ? { category } : {} })
      .then((res) => setAllFacets(res.data))
      .catch(() => setAllFacets({ brands: [], genders: [] }));
  }, [category]);

  useEffect(() => {
    client
      .get('/products/facets', {
        params: {
          ...(category ? { category } : {}),
          ...(q ? { search: q } : {}),
          ...(sale ? { on_sale: 1 } : {}),
          ...(inStock ? { in_stock: 1 } : {}),
          // Sent so each facet narrows by the *other* ones (the server counts a
          // facet under every filter but its own) — no choice leads to an empty
          // page, and a selected option that has run dry still comes back.
          ...(brand ? { brand } : {}),
          ...(gender ? { gender } : {}),
          ...(pmin != null ? { price_min: pmin } : {}),
          ...(pmax != null ? { price_max: pmax } : {}),
        },
      })
      .then((res) => setFacets(res.data))
      .catch(() => setFacets({ brands: [], genders: [], price: null }));
  }, [category, q, sale, inStock, brand, gender, pmin, pmax]);

  const fetchPage = useCallback(
    (n) => {
      const [field, order] = sort.split(':');
      return client.get('/products', {
        params: {
          ...(category ? { category } : {}),
          ...(q ? { search: q } : {}),
          ...(brand ? { brand } : {}),
          ...(gender ? { gender } : {}),
          ...(sale ? { on_sale: 1 } : {}),
          ...(inStock ? { in_stock: 1 } : {}),
          ...(pmin != null ? { price_min: pmin } : {}),
          ...(pmax != null ? { price_max: pmax } : {}),
          sort: field,
          order,
          page: n,
          limit: LIMIT,
        },
      });
    },
    [category, q, brand, gender, sale, inStock, pmin, pmax, sort]
  );

  // A new selection starts the list again from its first page. Two filter
  // clicks in quick succession start two requests that can land out of order,
  // so only the newest generation may write — and a "load more" still in
  // flight from the old list is dropped the same way.
  //
  // The one exception: right after a Back, the first selection is already on
  // screen from memory. (Compared by fetchPage, so StrictMode's second run of
  // this effect skips too, and the next real filter change fetches.)
  const restoredFor = useRef(memory ? 'pending' : null);
  useEffect(() => {
    if (restoredFor.current === 'pending' || restoredFor.current === fetchPage) {
      restoredFor.current = fetchPage;
      return;
    }
    restoredFor.current = null;
    const request = (requestRef.current += 1);
    setLoading(true);
    setLoadMoreFailed(false);
    fetchPage(1)
      .then((res) => {
        if (request !== requestRef.current) return;
        appendFrom.current = Infinity; // a refinement replaces; nothing animates in
        setProducts(res.data.items);
        setTotal(res.data.total);
        setPage(1);
        setLoaded(true);
      })
      .catch(() => {
        // Leave the list a shopper is reading on screen rather than blanking it
        // over a dropped request; the next filter change retries.
      })
      .finally(() => {
        if (request === requestRef.current) setLoading(false);
      });
  }, [fetchPage]);

  // The next page, added under the cards already on screen.
  const hasMore = loaded && products.length < total;
  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || loading || !hasMore) return;
    const request = requestRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    fetchPage(page + 1)
      .then((res) => {
        if (request !== requestRef.current) return;
        setProducts((prev) => {
          appendFrom.current = prev.length; // only the new cards make an entrance
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...res.data.items.filter((p) => !seen.has(p.id))];
        });
        setTotal(res.data.total);
        setPage((n) => n + 1);
      })
      .catch(() => request === requestRef.current && setLoadMoreFailed(true))
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [fetchPage, page, loading, hasMore]);

  // Load the next page as the end of the grid comes near — well before the
  // shopper reaches it, so on an ordinary scroll the cards are already there.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadMoreFailed || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: '0px 0px 800px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, loadMoreFailed]);

  // Remember the list on the way out, and put the scroll back on the way in —
  // after Layout's scroll-to-top for the new path, hence the animation frame.
  // The scroll position is tracked as it changes: by the time this unmounts,
  // the product page has replaced the grid and the browser has already
  // clamped scrollY to the shorter page.
  const listRef = useRef(null);
  listRef.current = { search: params.toString(), key: location.key, products, total, page };
  const scrollRef = useRef(memory?.scrollY ?? 0);
  useEffect(() => {
    const path = window.location.pathname;
    const onScroll = () => {
      // Once the URL has moved on, scroll events belong to the next page.
      if (window.location.pathname === path) scrollRef.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (memory) requestAnimationFrame(() => window.scrollTo({ top: memory.scrollY, behavior: 'instant' }));
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (listRef.current.products.length) writeListMemory({ ...listRef.current, scrollY: scrollRef.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Runs after the render in which `loaded` first turns true — so that render,
  // the one that paints the first grid, still sees firstPaint.current === true.
  useEffect(() => {
    if (loaded) firstPaint.current = false;
  }, [loaded]);
  const heading = activeCat
    ? categoryLabel(locale, activeCat)
    : q
      ? `“${q}”`
      : sale && !category
        ? t('nav.sale')
        : t('shop.collection');
  useDocumentTitle(heading);
  const clearAll = useCallback(() => {
    setQDraft('');
    patch({ brand: '', gender: '', sale: '', stock: '', pmin: '', pmax: '', q: '' });
  }, [patch]);

  // One chip per choice in force, each removable on its own.
  const priceUnits = usePriceUnits();
  const brandName = (slug) => allFacets.brands.find((b) => b.slug === slug)?.name || facets.brands.find((b) => b.slug === slug)?.name || slug;
  const chips = [
    ...(q ? [{ key: 'q', label: `“${q}”`, remove: () => { setQDraft(''); patch({ q: '' }); } }] : []),
    ...(sale ? [{ key: 'sale', label: t('filter.onSale'), remove: () => patch({ sale: '' }) }] : []),
    ...(inStock ? [{ key: 'stock', label: t('filter.inStock'), remove: () => patch({ stock: '' }) }] : []),
    ...(pmin != null || pmax != null
      ? [{
          key: 'price',
          label:
            pmax == null
              ? t('filter.priceOver', { v: priceUnits.fmt(priceUnits.fromUsd(pmin)) })
              : pmin == null
                ? t('filter.priceUnder', { v: priceUnits.fmt(priceUnits.fromUsd(pmax)) })
                : `${priceUnits.fmt(priceUnits.fromUsd(pmin))} – ${priceUnits.fmt(priceUnits.fromUsd(pmax))}`,
          remove: () => patch({ pmin: '', pmax: '' }),
        }]
      : []),
    ...(gender ? [{ key: 'gender', label: t(`gender.${gender}`), remove: () => patch({ gender: '' }) }] : []),
    ...brands.map((b) => ({
      key: `brand-${b}`,
      label: brandName(b),
      remove: () => patch({ brand: brands.filter((x) => x !== b).join(',') }),
    })),
  ];
  const activeCount = chips.length;
  const controlProps = {
    t, brands, gender, sale, inStock, pmin, pmax, q, qDraft, setQDraft, facets, allFacets, patch, clearAll,
  };

  return (
    <>
      {/* The listing is arranged as a working browse page rather than an
          editorial opener: category bar across the top, then the filter rail
          and the grid side by side — all on the full-bleed rail so a wide
          screen is spent on products. The house vocabulary is unchanged
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

      {/* lg:min-h — at least as tall as the fixed rail (its height + the
          rail's offset below this block's top + the footer gap), so the
          footer always starts below the rail, never under it. */}
      <div className="container-bar pt-8 pb-10 md:pb-12 lg:min-h-[calc(var(--shop-rail-h,0px)+4.5rem)]">
        <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10 xl:grid-cols-[17rem_1fr] xl:gap-14">
          <aside className="hidden lg:block" />

          <FixedFilterRail controlProps={controlProps} />

          <div className="min-w-0">
            <div className={`${HEAD_ROW} mb-8`}>
                <h1 className={`${HEAD_TEXT} min-w-0 truncate`}>
                  {/* Until the first answer there is no count to give — a
                      placeholder, never a "0" that reads as an empty shop. */}
                  {loaded ? (
                    t('shop.pieces', { n: total })
                  ) : (
                    <span aria-busy="true" className="inline-block h-3 w-28 animate-pulse bg-surface align-middle" />
                  )}
                </h1>

                <div className="flex shrink-0 items-center gap-4 sm:gap-5">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="tap-area micro inline-flex items-center gap-1.5 transition-colors duration-300 hover:text-gold lg:hidden"
                  >
                    <Icon name="filter" className="h-3.5 w-3.5" />
                    {t('shop.filters')}
                    {activeCount > 0 && <span className="text-gold">({activeCount})</span>}
                  </button>
                  <div className="flex items-center">
                    {/* No visible "Sort" label — the chosen order speaks for
                        itself; screen readers still hear what the control is. */}
                    <Select
                      id="listing-sort"
                      aria-label={t('shop.sortBy')}
                      bare
                      className="shrink-0"
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
            <ActiveFilters t={t} chips={chips} clearAll={clearAll} />
            <div>
              {!loaded ? (
                <ProductGridSkeleton />
              ) : products.length === 0 && sale && chips.length === 1 ? (
                /* Sale on its own came back empty: there is simply no active
                   discount right now. Say that, and offer the same listing
                   without the sale filter rather than a reset of everything. */
                <EmptyState
                  inline
                  eyebrow={t('nav.sale')}
                  title={t('shop.saleEmpty')}
                  body={t('shop.saleEmptyHint')}
                  actions={
                    /* Keep the category if there is one; with none, `all=1` keeps
                       us on the full listing instead of the category chooser. */
                    <Button variant="outline-dark" onClick={() => patch({ sale: '', ...(category ? {} : { all: '1' }) })}>
                      {t('shop.everything')}
                    </Button>
                  }
                />
              ) : products.length === 0 ? (
                <EmptyState
                  inline
                  eyebrow={t('shop.collection')}
                  title={q ? t('search.none', { q }) : t('shop.empty')}
                  body={t('shop.emptyHint')}
                  actions={
                    <Button
                      variant="outline-dark"
                      onClick={() => {
                        // One URL write: two in the same tick can overwrite each other.
                        setQDraft('');
                        patch({ brand: '', gender: '', sale: '', stock: '', pmin: '', pmax: '', q: '', category: '', all: '1' });
                      }}
                    >
                      {t('shop.everything')}
                    </Button>
                  }
                />
              ) : (
                <div
                  aria-busy={loading}
                  className={`grid grid-cols-2 gap-x-6 gap-y-12 transition-opacity duration-300 ease-[var(--ease-luxe)] md:grid-cols-3 md:gap-y-16 xl:grid-cols-4 min-[106.25rem]:grid-cols-5 ${loading ? 'opacity-45' : 'opacity-100'
                    }`}
                >
                  {products.map((p, i) => (
                    <Reveal
                      key={p.id}
                      delay={(i % 4) * 0.06}
                      startShown={!firstPaint.current && i < appendFrom.current}
                    >
                      <ProductCard product={p} />
                    </Reveal>
                  ))}
                  {/* The next page's places, held open while it loads — the
                      cards then land exactly where these stand. */}
                  {loadingMore &&
                    Array.from({ length: Math.min(4, total - products.length) }).map((_, i) => (
                      <div key={`more-${i}`} aria-hidden="true">
                        <Skeleton className="aspect-[4/5] w-full" />
                        <Skeleton className="mt-5 h-4 w-2/3" />
                        <Skeleton className="mt-2 h-3 w-1/3" />
                      </div>
                    ))}
                </div>
              )}
            </div>

            {loaded && products.length > 0 && (
              <div className="mt-14 flex flex-col items-center gap-5 border-t border-line pt-8 text-center md:mt-16">
                {/* How far through the selection the shopper is. */}
                <p className="micro tracking-meta text-muted" aria-live="polite">
                  {hasMore
                    ? t('shop.showing', { n: products.length, total })
                    : t('shop.seenAll', { n: total })}
                </p>
                {hasMore && (
                  <div className="h-px w-40 overflow-hidden bg-line" aria-hidden="true">
                    <div className="h-full bg-gold transition-[width] duration-500" style={{ width: `${(products.length / total) * 100}%` }} />
                  </div>
                )}
                {/* Scrolling loads the next page on its own; the button is for a
                    keyboard, for a failed request, and for a browser without
                    IntersectionObserver. */}
                {hasMore && !loadingMore && (
                  <TextButton onClick={loadMore}>
                    {loadMoreFailed ? t('shop.loadMoreRetry') : t('shop.loadMore')}
                  </TextButton>
                )}
                {loadingMore && <p className="micro tracking-meta text-gold">{t('shop.loadingMore')}</p>}
                <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phone and tablet filters: the shared side panel, from the left —
          focus kept inside, Escape and the scrim close it. */}
      <SidePanel
        open={drawerOpen}
        side="left"
        size="sm"
        title={t('shop.filters')}
        onClose={closeDrawer}
        actions={
          activeCount > 0 && (
            <button type="button" onClick={clearAll} className="link-lux tap-area micro text-gold">
              {t('shop.clear')}
            </button>
          )
        }
        footer={
          <Button full className="font-catalog" onClick={closeDrawer}>
            {t('shop.pieces', { n: total })}
          </Button>
        }
      >
        <FilterControls {...controlProps} showHead={false} />
      </SidePanel>
    </>
  );
}
