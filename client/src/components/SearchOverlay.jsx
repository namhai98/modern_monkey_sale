import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useUI } from '../context/UIContext';
import { resizeUnsplash } from '../lib/media';

export default function SearchOverlay() {
  const { searchOpen, closeSearch } = useUI();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchOpen) {
      setQ('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      client
        .get('/products', { params: { search: q, limit: 6 } })
        .then((res) => setResults(res.data.items))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function open(id) {
    closeSearch();
    navigate(`/products/${id}`);
  }

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-canvas"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="max-w-3xl mx-auto px-6 pt-28">
            <div className="flex items-center justify-between mb-6">
              <span className="eyebrow text-stone">Search</span>
              <button onClick={closeSearch} className="text-sm text-stone hover:text-ink" aria-label="Close search">
                Close
              </button>
            </div>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="What are you looking for?"
              className="w-full bg-transparent border-b border-line pb-4 font-display text-3xl md:text-4xl placeholder:text-mist focus:outline-none focus:border-ink transition-colors"
            />

            <div className="mt-10 space-y-1">
              {loading && <p className="text-sm text-stone">Searching…</p>}
              {!loading && q.trim() && results.length === 0 && (
                <p className="text-sm text-stone">Nothing found for “{q}”.</p>
              )}
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => open(p.id)}
                  className="w-full flex items-center gap-4 py-3 text-left border-b border-line/60 group"
                >
                  <div className="h-14 w-12 bg-ivory overflow-hidden shrink-0">
                    {p.image_url && (
                      <img src={resizeUnsplash(p.image_url, 120)} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="flex-1 font-display text-lg group-hover:italic">{p.name}</span>
                  <span className="text-sm text-stone">${p.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
