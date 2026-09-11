import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useUI } from '../context/UIContext';
import { useLocale } from '../context/LocaleContext';
import { resizeUnsplash } from '../lib/media';
import ImageFallback from './ImageFallback';
import Price from './Price';

/* Full-screen search, in the presentation site's overlay language: an ink
   ground at 97% with a blur behind it, the query set in Playfair at display
   size over a single hairline that turns gold on focus, and results as plain
   rows separated by hairlines — no cards, no shadows. */
export default function SearchOverlay() {
  const { searchOpen, closeSearch } = useUI();
  const { t } = useLocale();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Opening the overlay with an empty field is not a useful empty state —
  // show a handful of suggested products right away so there's always
  // something to browse before the shopper types anything.
  useEffect(() => {
    if (!searchOpen) return;
    setQ('');
    setLoading(true);
    client
      .get('/products', { params: { limit: 6, sort: 'created_at', order: 'desc' } })
      .then((res) => setResults(res.data.items))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 120);
  }, [searchOpen]);

  useEffect(() => {
    // Empty query: leave the suggested products from above in place.
    if (!q.trim()) return undefined;
    const id = setTimeout(() => {
      setLoading(true);
      client
        .get('/products', { params: { search: q, limit: 6 } })
        .then((res) => setResults(res.data.items))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeSearch();
    window.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [searchOpen, closeSearch]);

  function open(id) {
    closeSearch();
    navigate(`/products/${id}`);
  }

  function seeAll(e) {
    e?.preventDefault();
    const term = q.trim();
    if (!term) return;
    closeSearch();
    navigate(`/shop?q=${encodeURIComponent(term)}`);
  }

  if (!searchOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.search')}
      className="fixed inset-0 z-[70] animate-[fadeIn_0.25s_ease-out] overflow-y-auto bg-ink/97 text-white backdrop-blur-sm"
    >
      <div className="container-lux max-w-3xl pb-20 pt-24 md:pt-32">
        <div className="mb-8 flex items-center justify-between">
          <span className="eyebrow">{t('nav.search')}</span>
          <button
            onClick={closeSearch}
            className="link-lux micro text-white/55 transition-colors hover:text-gold"
            aria-label={t('nav.close')}
          >
            {t('nav.close')}
          </button>
        </div>

        <form onSubmit={seeAll}>
          <label htmlFor="search-q" className="sr-only">
            {t('search.placeholder')}
          </label>
          <input
            id="search-q"
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            className="heading-serif w-full border-b border-white/20 bg-transparent pb-4 text-2xl text-white transition-colors duration-300 placeholder:text-white/30 focus:border-gold focus:outline-none md:text-4xl"
          />
        </form>

        <div className="mt-12">
          {loading && <p className="micro text-white/45">{t('search.searching')}</p>}
          {!loading && q.trim() && results.length === 0 && (
            <div className="py-8">
              <p className="heading-serif text-2xl">{t('search.none', { q })}</p>
            </div>
          )}
          {!loading && !q.trim() && results.length > 0 && (
            <p className="eyebrow mb-4">{t('search.suggested')}</p>
          )}

          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => open(p.id)}
              className="group flex w-full items-center gap-5 border-b border-white/10 py-4 text-left"
            >
              <div className="h-16 w-14 shrink-0 overflow-hidden bg-white/5">
                <ImageFallback
                  src={resizeUnsplash(p.image_url, 120)}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                />
              </div>
              <span className="heading-serif min-w-0 flex-1 truncate text-lg transition-colors duration-300 group-hover:text-gold">
                {p.name}
              </span>
              <Price product={p} tone="dark" className="shrink-0" />
            </button>
          ))}

          {!loading && q.trim() && results.length > 0 && (
            <button onClick={seeAll} className="link-lux micro mt-8 inline-block tracking-[0.3em] text-gold">
              {t('shop.viewAll')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
