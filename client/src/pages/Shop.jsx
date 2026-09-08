import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import { media, resizeUnsplash } from '../lib/media';
import { useLocale } from '../context/LocaleContext';
import { categoryLabel } from '../lib/i18n';

const LIMIT = 15;
const DEFAULT_SORT = 'created_at:desc';

function categoryImage(slug) {
  return media.bands[slug] || media.editorialRight;
}

/* ── selectable pill ─────────────────────────────────────────── */
function Pill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 px-3.5 py-1.5 text-[0.7rem] uppercase tracking-[0.14em] border transition-colors ${
        active
          ? 'bg-ink text-canvas border-ink'
          : 'bg-transparent text-ink border-line hover:border-ink'
      }`}
    >
      {children}
    </button>
  );
}

function PillGroup({ label, children }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="eyebrow text-stone mr-1">{label}</span>
      {children}
    </div>
  );
}

/* ── "All" landing: pick a category, or search ────────────────── */
function CategoryChooser({ categories }) {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  function submit(e) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop?all=1');
  }

  return (
    <div className="bg-canvas">
      <div className="px-4 md:px-8 pt-16 pb-10 text-center">
        <p className="eyebrow text-stone">{t('shop.allPieces')}</p>
        <h1 className="font-display text-4xl md:text-5xl mt-3">{t('shop.collection')}</h1>
        <p className="text-stone text-sm mt-4">{t('shop.choose')}</p>

        <form onSubmit={submit} className="mt-8 max-w-md mx-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('shop.search')}
            aria-label={t('shop.search')}
            className="w-full bg-transparent border-b border-line pb-2 text-center text-sm placeholder:text-mist focus:outline-none focus:border-ink transition-colors"
          />
        </form>
        <Link to="/shop?all=1" className="inline-block mt-5 eyebrow link-underline">
          {t('shop.everything')}
        </Link>
      </div>

      <div className="grid md:grid-cols-3">
        {categories.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.08}>
            <Link
              to={`/shop?category=${c.slug}`}
              className="group relative block aspect-[3/4] md:aspect-auto md:h-[78vh] overflow-hidden"
            >
              <img
                src={resizeUnsplash(categoryImage(c.slug), 1200)}
                alt={categoryLabel(locale, c)}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-ink/25 group-hover:bg-ink/35 transition-colors duration-500" />
              <div className="relative h-full flex flex-col items-center justify-center text-canvas text-center">
                <p className="eyebrow">{`0${i + 1}`}</p>
                <h2 className="font-display text-4xl md:text-5xl mt-2">{categoryLabel(locale, c)}</h2>
                <p className="eyebrow mt-4 text-canvas/70">{t('shop.pieces', { n: c.product_count })}</p>
                <span className="mt-6 eyebrow link-underline">{t('shop.explore')}</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ── Listing: grid + toolbar, all state lives in the URL ──────── */
function Listing({ categories }) {
  const { t, locale } = useLocale();
  const [params, setParams] = useSearchParams();

  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const brand = params.get('brand') || '';
  const gender = params.get('gender') || '';
  const sort = params.get('sort') || DEFAULT_SORT;
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState({ brands: [], genders: [] });
  const [loading, setLoading] = useState(true);

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
        params: { ...(category ? { category } : {}), ...(q ? { search: q } : {}) },
      })
      .then((res) => setFacets(res.data))
      .catch(() => setFacets({ brands: [], genders: [] }));
  }, [category, q]);

  useEffect(() => {
    const [field, order] = sort.split(':');
    setLoading(true);
    client
      .get('/products', {
        params: {
          ...(category ? { category } : {}),
          ...(q ? { search: q } : {}),
          ...(brand ? { brand } : {}),
          ...(gender ? { gender } : {}),
          sort: field,
          order,
          page,
          limit: LIMIT,
        },
      })
      .then((res) => {
        setProducts(res.data.items);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  }, [category, q, brand, gender, sort, page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const heading = activeCat ? categoryLabel(locale, activeCat) : q ? `“${q}”` : t('shop.collection');

  const clearSearch = () => {
    setQDraft('');
    patch({ q: '' });
  };
  const clearAll = () => {
    setQDraft('');
    patch({ q: '', brand: '', gender: '' });
  };
  const hasActiveFilters = Boolean(q || brand || gender);

  return (
    <div className="bg-canvas">
      {/* compact header */}
      <div className="px-4 md:px-8 pt-8 md:pt-12 pb-5">
        <h1 className="font-display text-2xl md:text-3xl leading-tight">{heading}</h1>
        <p className="text-xs text-stone mt-1 tabular-nums">{t('shop.pieces', { n: total })}</p>
      </div>

      {/* toolbar — stays in view while the grid scrolls */}
      <div className="sticky top-16 md:top-20 z-30 bg-canvas border-y border-line">
        {/* categories + sort */}
        <div className="px-4 md:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 py-0.5">
            <Pill
              active={category === ''}
              onClick={() => patch({ category: '', brand: '', gender: '', all: '1' })}
            >
              {t('nav.all')}
            </Pill>
            {categories.map((c) => (
              <Pill
                key={c.id}
                active={c.slug === category}
                onClick={() => patch({ category: c.slug, brand: '', gender: '', all: '' })}
              >
                {categoryLabel(locale, c)}
              </Pill>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => patch({ sort: e.target.value === DEFAULT_SORT ? '' : e.target.value })}
            className="shrink-0 border border-line bg-canvas px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.14em] text-ink cursor-pointer focus:outline-none focus:border-ink"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* search + facets */}
        <div className="px-4 md:px-8 py-3 border-t border-line flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-8">
          <div className="relative w-full lg:w-72 shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-stone"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder={t('shop.search')}
              aria-label={t('shop.search')}
              className="w-full bg-transparent border-b border-line pl-6 pr-6 py-1.5 text-sm placeholder:text-mist focus:outline-none focus:border-ink transition-colors"
            />
            {qDraft && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label={t('shop.clear')}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-stone hover:text-ink text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-8 gap-y-3 lg:flex-1">
            {facets.genders.length > 0 && (
              <PillGroup label={t('filter.gender')}>
                <Pill active={gender === ''} onClick={() => patch({ gender: '' })}>
                  {t('filter.all')}
                </Pill>
                {facets.genders.map((g) => (
                  <Pill
                    key={g.value}
                    active={gender === g.value}
                    onClick={() => patch({ gender: g.value })}
                  >
                    {t(`gender.${g.value}`)}
                  </Pill>
                ))}
              </PillGroup>
            )}
            {facets.brands.length > 0 && (
              <PillGroup label={t('filter.brand')}>
                <Pill active={brand === ''} onClick={() => patch({ brand: '' })}>
                  {t('filter.all')}
                </Pill>
                {facets.brands.map((b) => (
                  <Pill
                    key={b.value}
                    active={brand === b.value}
                    onClick={() => patch({ brand: b.value })}
                  >
                    {b.value}
                  </Pill>
                ))}
              </PillGroup>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="self-start lg:self-center eyebrow text-stone hover:text-ink underline underline-offset-4 whitespace-nowrap"
            >
              {t('shop.clear')}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 md:px-8 py-16">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-12">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-ivory animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-stone py-20">
            {q ? t('search.none', { q }) : t('shop.empty')}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-12">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={(i % 5) * 0.04}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-8 mt-20 eyebrow">
            <button
              onClick={() => patch({ page: page > 2 ? page - 1 : '' })}
              disabled={page <= 1}
              className="link-underline disabled:opacity-30 disabled:no-underline"
            >
              {t('shop.prev')}
            </button>
            <span className="text-stone">{page} / {totalPages}</span>
            <button
              onClick={() => patch({ page: page + 1 })}
              disabled={page >= totalPages}
              className="link-underline disabled:opacity-30"
            >
              {t('shop.next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Shop() {
  const [params] = useSearchParams();
  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const all = params.get('all') === '1';
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    client.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  if (!category && !q && !all) return <CategoryChooser categories={categories} />;
  return <Listing categories={categories} />;
}
