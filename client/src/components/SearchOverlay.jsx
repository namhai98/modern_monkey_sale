import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useUI } from '../context/UIContext';
import { useLocale } from '../context/LocaleContext';
import { resizeUnsplash } from '../lib/media';
import { useMoney } from '../lib/price';
import ImageFallback from './ImageFallback';

export default function SearchOverlay() {
  const { searchOpen, closeSearch } = useUI();
  const { t } = useLocale();
  const money = useMoney();
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
    if (!q.trim()) return;
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
    <div className="fixed inset-0 z-50 bg-canvas animate-[fadeIn_0.25s_ease-out] overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 pt-24 md:pt-28">
            <div className="flex items-center justify-between mb-6">
              <span className="eyebrow text-stone">{t('nav.search')}</span>
              <button onClick={closeSearch} className="text-sm text-stone hover:text-ink" aria-label={t('nav.close')}>
                {t('nav.close')}
              </button>
            </div>
            <form onSubmit={seeAll}>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('search.placeholder')}
                className="w-full bg-transparent border-b border-line pb-4 font-display text-2xl md:text-4xl text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink transition-colors"
              />
            </form>

            <div className="mt-10 space-y-1">
              {loading && <p className="text-sm text-stone">{t('search.searching')}</p>}
              {!loading && q.trim() && results.length === 0 && (
                <p className="text-sm text-stone">{t('search.none', { q })}</p>
              )}
              {!loading && !q.trim() && results.length > 0 && (
                <p className="eyebrow text-stone mb-2">{t('search.suggested')}</p>
              )}
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => open(p.id)}
                  className="w-full flex items-center gap-4 py-3 text-left border-b border-line/60 group"
                >
                  <div className="h-14 w-12 bg-ivory overflow-hidden shrink-0">
                    <ImageFallback src={resizeUnsplash(p.image_url, 120)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <span className="flex-1 font-display text-lg text-ink group-hover:italic">{p.name}</span>
                  <span className="text-sm text-stone">{money(p.final_price ?? p.price)}</span>
                </button>
              ))}
              {!loading && q.trim() && results.length > 0 && (
                <button onClick={seeAll} className="mt-6 inline-block eyebrow link-underline">
                  {t('shop.viewAll')}
                </button>
              )}
            </div>
      </div>
    </div>
  );
}
