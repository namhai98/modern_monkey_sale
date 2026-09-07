import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import client from '../api/client';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';

const SORTS = [
  { value: 'created_at:desc', label: 'Newest' },
  { value: 'price:asc', label: 'Price · low to high' },
  { value: 'price:desc', label: 'Price · high to low' },
  { value: 'name:asc', label: 'Alphabetical' },
];
const LIMIT = 9;

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('created_at:desc');
  const [categories, setCategories] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [category, sort]);

  useEffect(() => {
    const [field, order] = sort.split(':');
    setLoading(true);
    client
      .get('/products', {
        params: {
          ...(category ? { category } : {}),
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
  }, [category, sort, page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const activeCat = categories.find((c) => c.slug === category);

  function setCategory(slug) {
    const next = new URLSearchParams(params);
    if (slug) next.set('category', slug);
    else next.delete('category');
    setParams(next);
  }

  return (
    <div className="bg-canvas">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8 text-center">
        <p className="eyebrow text-stone">{activeCat ? activeCat.name : 'All Pieces'}</p>
        <h1 className="font-display text-4xl md:text-5xl mt-3">
          {activeCat ? activeCat.name : 'The Collection'}
        </h1>
      </div>

      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between border-y border-line py-4 text-sm">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="eyebrow link-underline"
        >
          {filtersOpen ? 'Hide filters' : 'Filters'}
        </button>
        <span className="text-stone">{total} pieces</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-transparent eyebrow focus:outline-none cursor-pointer text-right"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-line"
          >
            <div className="max-w-7xl mx-auto px-6 py-6 flex flex-wrap gap-3">
              <button
                onClick={() => setCategory('')}
                className={`px-4 py-2 text-sm border ${
                  !category ? 'border-ink text-ink' : 'border-line text-stone hover:border-ink'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.slug)}
                  className={`px-4 py-2 text-sm border ${
                    category === c.slug ? 'border-ink text-ink' : 'border-line text-stone hover:border-ink'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-ivory animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-stone py-20">Nothing here yet.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.05}>
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
              Prev
            </button>
            <span className="text-stone">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="link-underline disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
