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

function FacetRow({ label, options, value, onPick, translate }) {
  if (options.length === 0) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="eyebrow text-stone">{label}</span>
      <button
        onClick={() => onPick('')}
        className={`eyebrow ${value === '' ? 'text-ink' : 'text-stone hover:text-ink'}`}
      >
        {translate('filter.all')}
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onPick(o.value)}
          className={`eyebrow ${value === o.value ? 'text-ink' : 'text-stone hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
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
  const chips = [
    q && { key: 'q', label: `“${q}”`, clear: clearSearch },
    gender && { key: 'gender', label: t(`gender.${gender}`), clear: () => patch({ gender: '' }) },
    brand && { key: 'brand', label: brand, clear: () => patch({ brand: '' }) },
  ].filter(Boolean);

  return (
    <div className="bg-canvas">
      <div className="px-4 md:px-8 pt-16 pb-8 text-center">
        <p className="eyebrow text-stone">{t('shop.pieces', { n: total })}</p>
        <h1 className="font-display text-4xl md:text-5xl mt-3">{heading}</h1>
      </div>

      <div className="border-y border-line">
        {/* categories + sort */}
        <div className="px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto -mx-1 px-1">
            <button
              onClick={() => patch({ category: '', brand: '', gender: '', all: '1' })}
              className={`eyebrow whitespace-nowrap ${category === '' ? 'text-ink' : 'text-stone hover:text-ink'}`}
            >
              {t('nav.all')}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => patch({ category: c.slug, brand: '', gender: '', all: '' })}
                className={`eyebrow whitespace-nowrap ${
                  c.slug === category ? 'text-ink' : 'text-stone hover:text-ink'
                }`}
              >
                {categoryLabel(locale, c)}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => patch({ sort: e.target.value === DEFAULT_SORT ? '' : e.target.value })}
            className="bg-transparent eyebrow focus:outline-none cursor-pointer self-start sm:self-auto sm:text-right shrink-0"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* search + facets */}
        <div className="px-4 md:px-8 py-4 border-t border-line flex flex-col lg:flex-row lg:items-center gap-x-10 gap-y-4">
          <input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder={t('shop.search')}
            aria-label={t('shop.search')}
            className="w-full lg:w-64 bg-transparent border-b border-line pb-2 text-sm placeholder:text-mist focus:outline-none focus:border-ink transition-colors"
          />
          <FacetRow
            label={t('filter.gender')}
            options={facets.genders.map((g) => ({ value: g.value, label: t(`gender.${g.value}`) }))}
            value={gender}
            onPick={(v) => patch({ gender: v })}
            translate={t}
          />
          <FacetRow
            label={t('filter.brand')}
            options={facets.brands.map((b) => ({ value: b.value, label: b.value }))}
            value={brand}
            onPick={(v) => patch({ brand: v })}
            translate={t}
          />
        </div>

        {/* active filters */}
        {chips.length > 0 && (
          <div className="px-4 md:px-8 py-3 border-t border-line flex items-center gap-2 flex-wrap text-xs">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={c.clear}
                className="inline-flex items-center gap-1.5 border border-line px-3 py-1 hover:border-ink transition-colors"
              >
                {c.label}
                <span aria-hidden="true">×</span>
              </button>
            ))}
            {chips.length > 1 && (
              <button
                onClick={() => {
                  setQDraft('');
                  patch({ q: '', brand: '', gender: '' });
                }}
                className="eyebrow text-stone hover:text-ink ml-1"
              >
                {t('shop.clear')}
              </button>
            )}
          </div>
        )}
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
