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

/* ── the filter rail body — shared by the desktop column and the mobile drawer ── */
function FilterControls({ t, locale, categories, category, brand, gender, sale, facets, patch }) {
  const rowCls = (active) =>
    `flex items-center gap-2.5 w-full text-left py-1 text-sm transition-colors ${
      active ? 'text-ink' : 'text-stone hover:text-ink'
    }`;
  const dot = (on) => (
    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${on ? 'bg-ink' : 'bg-line'}`} />
  );

  return (
    <div className="space-y-8">
      <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={sale}
          onChange={(e) => patch({ sale: e.target.checked ? '1' : '' })}
          className="accent-ink"
        />
        <span className={sale ? 'text-ink' : 'text-stone'}>{t('filter.onSale')}</span>
      </label>

      <div>
        <p className="eyebrow text-stone mb-3">{t('shop.category')}</p>
        <ul>
          <li>
            <button
              onClick={() => patch({ category: '', brand: '', gender: '', all: '1' })}
              className={rowCls(category === '')}
            >
              {dot(category === '')}
              {t('nav.all')}
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => patch({ category: c.slug, brand: '', gender: '', all: '' })}
                className={rowCls(c.slug === category)}
              >
                {dot(c.slug === category)}
                {categoryLabel(locale, c)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {facets.genders.length > 0 && (
        <div>
          <p className="eyebrow text-stone mb-3">{t('filter.gender')}</p>
          <div className="flex flex-wrap gap-2">
            <Pill active={gender === ''} onClick={() => patch({ gender: '' })}>
              {t('filter.all')}
            </Pill>
            {facets.genders.map((g) => (
              <Pill key={g.value} active={gender === g.value} onClick={() => patch({ gender: g.value })}>
                {t(`gender.${g.value}`)}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {facets.brands.length > 0 && (
        <div>
          <p className="eyebrow text-stone mb-3">{t('filter.brand')}</p>
          <div className="flex flex-wrap gap-2">
            <Pill active={brand === ''} onClick={() => patch({ brand: '' })}>
              {t('filter.all')}
            </Pill>
            {facets.brands.map((b) => (
              <Pill key={b.value} active={brand === b.value} onClick={() => patch({ brand: b.value })}>
                {b.value}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {(brand || gender || sale) && (
        <button
          type="button"
          onClick={() => patch({ brand: '', gender: '', sale: '' })}
          className="eyebrow text-stone hover:text-ink underline underline-offset-4"
        >
          {t('shop.clear')}
        </button>
      )}
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
        <div className="mt-5 flex items-center justify-center gap-6">
          <Link to="/shop?all=1" className="eyebrow link-underline">
            {t('shop.everything')}
          </Link>
          <Link to="/shop?sale=1" className="eyebrow link-underline text-champagne">
            {t('nav.sale')}
          </Link>
        </div>
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

/* ── Listing: left filter rail + grid, all state lives in the URL ── */
function Listing({ categories }) {
  const { t, locale } = useLocale();
  const [params, setParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const brand = params.get('brand') || '';
  const gender = params.get('gender') || '';
  const sale = params.get('sale') === '1';
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

  // lock body scroll + auto-close the mobile drawer once we reach desktop
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setDrawerOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
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
        setProducts(res.data.items);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  }, [category, q, brand, gender, sale, sort, page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const heading = activeCat
    ? categoryLabel(locale, activeCat)
    : q
    ? `“${q}”`
    : sale && !category
    ? t('nav.sale')
    : t('shop.collection');
  const activeCount = (brand ? 1 : 0) + (gender ? 1 : 0) + (sale ? 1 : 0);
  const controlProps = { t, locale, categories, category, brand, gender, sale, facets, patch };

  return (
    <div className="bg-canvas px-4 md:px-8 py-8 md:py-12">
      <div className="lg:grid lg:grid-cols-[13rem_1fr] xl:grid-cols-[15rem_1fr] lg:gap-10 xl:gap-14">
        {/* desktop rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <FilterControls {...controlProps} />
          </div>
        </aside>

        {/* content */}
        <div className="min-w-0">
          <div className="pb-5 border-b border-line mb-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl md:text-3xl leading-tight">{heading}</h1>
                <p className="text-xs text-stone mt-1 tabular-nums">{t('shop.pieces', { n: total })}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="lg:hidden inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.14em] hover:border-ink transition-colors"
                >
                  {t('shop.filters')}
                  {activeCount > 0 && <span className="text-champagne">({activeCount})</span>}
                </button>
                <select
                  value={sort}
                  onChange={(e) => patch({ sort: e.target.value === DEFAULT_SORT ? '' : e.target.value })}
                  className="border border-line bg-canvas px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.14em] text-ink cursor-pointer focus:outline-none focus:border-ink"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative mt-4 w-full sm:max-w-sm">
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
                  onClick={() => {
                    setQDraft('');
                    patch({ q: '' });
                  }}
                  aria-label={t('shop.clear')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-stone hover:text-ink text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-ivory animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-stone py-20">
              {q ? t('search.none', { q }) : t('shop.empty')}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 0.04}>
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

      {/* mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/30 animate-[fadeIn_0.2s_ease-out]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-canvas flex flex-col shadow-[1px_0_0_0_var(--color-line)]">
            <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
              <span className="eyebrow">{t('shop.filters')}</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-sm text-stone hover:text-ink"
                aria-label={t('nav.close')}
              >
                {t('nav.close')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <FilterControls {...controlProps} />
            </div>
            <div className="p-4 border-t border-line shrink-0">
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full bg-ink text-canvas h-11 eyebrow"
              >
                {t('shop.pieces', { n: total })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
    client.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  if (!category && !q && !all && !sale) return <CategoryChooser categories={categories} />;
  return <Listing categories={categories} />;
}
