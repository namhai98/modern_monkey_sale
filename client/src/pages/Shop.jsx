import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import { media, resizeUnsplash } from '../lib/media';
import { useLocale } from '../context/LocaleContext';
import { categoryLabel } from '../lib/i18n';

const LIMIT = 15;

function categoryImage(slug) {
  return media.bands[slug] || media.editorialRight;
}

/* ── "All" landing: pick a category ───────────────────────────── */
function CategoryChooser({ categories }) {
  const { t, locale } = useLocale();
  return (
    <div className="bg-canvas">
      <div className="px-4 md:px-8 pt-16 pb-10 text-center">
        <p className="eyebrow text-stone">{t('shop.allPieces')}</p>
        <h1 className="font-display text-4xl md:text-5xl mt-3">{t('shop.collection')}</h1>
        <p className="text-stone text-sm mt-4">{t('shop.choose')}</p>
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

/* ── Category view: the product grid ──────────────────────────── */
function CategoryProducts({ slug, categories }) {
  const { t, locale } = useLocale();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('created_at:desc');
  const [brand, setBrand] = useState('');
  const [gender, setGender] = useState('');
  const [facets, setFacets] = useState({ brands: [], genders: [] });
  const [loading, setLoading] = useState(true);

  const SORTS = useMemo(
    () => [
      { value: 'created_at:desc', label: t('sort.newest') },
      { value: 'price:asc', label: t('sort.priceAsc') },
      { value: 'price:desc', label: t('sort.priceDesc') },
      { value: 'name:asc', label: t('sort.name') },
    ],
    [t]
  );

  const activeCat = categories.find((c) => c.slug === slug);

  useEffect(() => {
    client
      .get('/products/facets', { params: { category: slug } })
      .then((res) => setFacets(res.data))
      .catch(() => setFacets({ brands: [], genders: [] }));
  }, [slug]);

  useEffect(() => {
    setPage(1);
  }, [slug, sort, brand, gender]);

  useEffect(() => {
    const [field, order] = sort.split(':');
    setLoading(true);
    client
      .get('/products', {
        params: {
          category: slug,
          sort: field,
          order,
          page,
          limit: LIMIT,
          ...(brand ? { brand } : {}),
          ...(gender ? { gender } : {}),
        },
      })
      .then((res) => {
        setProducts(res.data.items);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  }, [slug, sort, page, brand, gender]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="bg-canvas">
      <div className="px-4 md:px-8 pt-16 pb-8 text-center">
        <p className="eyebrow text-stone">{activeCat ? categoryLabel(locale, activeCat) : t('shop.collection')}</p>
        <h1 className="font-display text-4xl md:text-5xl mt-3">
          {activeCat ? categoryLabel(locale, activeCat) : t('shop.collection')}
        </h1>
      </div>

      <div className="px-4 md:px-8 border-y border-line py-4 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto -mx-1 px-1">
          <Link to="/shop" className="eyebrow link-underline whitespace-nowrap">
            {t('shop.backAll')}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/shop?category=${c.slug}`}
              className={`eyebrow whitespace-nowrap ${
                c.slug === slug ? 'text-ink' : 'text-stone hover:text-ink'
              }`}
            >
              {categoryLabel(locale, c)}
            </Link>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-transparent eyebrow focus:outline-none cursor-pointer self-start sm:self-auto sm:text-right shrink-0"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {(facets.genders.length > 0 || facets.brands.length > 0) && (
        <div className="px-4 md:px-8 border-b border-line py-4 flex flex-col sm:flex-row gap-x-10 gap-y-3">
          {facets.genders.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="eyebrow text-stone">{t('filter.gender')}</span>
              <button
                onClick={() => setGender('')}
                className={`eyebrow ${gender === '' ? 'text-ink' : 'text-stone hover:text-ink'}`}
              >
                {t('filter.all')}
              </button>
              {facets.genders.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGender(g.value)}
                  className={`eyebrow ${gender === g.value ? 'text-ink' : 'text-stone hover:text-ink'}`}
                >
                  {t(`gender.${g.value}`)}
                </button>
              ))}
            </div>
          )}
          {facets.brands.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="eyebrow text-stone">{t('filter.brand')}</span>
              <button
                onClick={() => setBrand('')}
                className={`eyebrow ${brand === '' ? 'text-ink' : 'text-stone hover:text-ink'}`}
              >
                {t('filter.all')}
              </button>
              {facets.brands.map((b) => (
                <button
                  key={b.value}
                  onClick={() => setBrand(b.value)}
                  className={`eyebrow ${brand === b.value ? 'text-ink' : 'text-stone hover:text-ink'}`}
                >
                  {b.value}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 md:px-8 py-16">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-12">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-ivory animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-stone py-20">{t('shop.empty')}</p>
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="link-underline disabled:opacity-30 disabled:no-underline"
            >
              {t('shop.prev')}
            </button>
            <span className="text-stone">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    client.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  if (!category) return <CategoryChooser categories={categories} />;
  return <CategoryProducts key={category} slug={category} categories={categories} />;
}
