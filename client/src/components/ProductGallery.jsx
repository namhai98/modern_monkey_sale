import { useEffect, useRef, useState } from 'react';

// `images`: [{ id, thumbnail, card, detail, width, height }]
export default function ProductGallery({ images = [], alt = '' }) {
  const pics = images.filter((p) => p && (p.detail || p.card));
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touch = useRef(null);

  useEffect(() => {
    setIndex(0);
  }, [pics.map((p) => p.id ?? p.detail).join('|')]);

  useEffect(() => {
    if (!zoom) return undefined;
    const onKey = (e) => e.key === 'Escape' && setZoom(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const clamp = (i) => Math.max(0, Math.min(pics.length - 1, i));
  const go = (i) => setIndex(clamp(i));

  // one fixed frame for every image: portrait on small screens, viewport-bound
  // on desktop so the thumbnail strip + product info stay on screen.
  const FRAME =
    'aspect-[4/5] sm:aspect-square lg:aspect-auto lg:h-[calc(100svh-12.5rem)] lg:min-h-[440px]';

  if (pics.length === 0) {
    return (
      <div className={`${FRAME} bg-ivory flex items-center justify-center`}>
        <span className="font-display text-6xl text-mist">MM</span>
      </div>
    );
  }

  const main = (p) => p.detail || p.card;
  const thumb = (p) => p.thumbnail || p.card || p.detail;

  // native swipe (mobile) — no animation-library dependency
  function onTouchStart(e) {
    touch.current = { x: e.touches[0].clientX, t: Date.now() };
  }
  function onTouchEnd(e) {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dt = Date.now() - touch.current.t;
    if (Math.abs(dx) > 45 || (Math.abs(dx) > 20 && dt < 250)) {
      go(index + (dx < 0 ? 1 : -1));
    } else if (Math.abs(dx) < 8 && dt < 250) {
      setZoom(true);
    }
    touch.current = null;
  }

  return (
    <div>
      <div
        className={`relative ${FRAME} overflow-hidden bg-ivory`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {pics.map((p, i) => (
            <button
              key={p.id ?? i}
              onClick={() => setZoom(true)}
              className="w-full h-full shrink-0 cursor-zoom-in"
              aria-label={alt}
              tabIndex={i === index ? 0 : -1}
            >
              <img
                src={main(p)}
                alt={alt}
                width={p.width || undefined}
                height={p.height || undefined}
                className="w-full h-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </button>
          ))}
        </div>

        {pics.length > 1 && (
          <>
            <button
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center bg-canvas/85 text-ink text-lg disabled:opacity-0 transition-opacity"
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              onClick={() => go(index + 1)}
              disabled={index === pics.length - 1}
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center bg-canvas/85 text-ink text-lg disabled:opacity-0 transition-opacity"
              aria-label="Next image"
            >
              ›
            </button>
            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-1.5">
              {pics.map((p, i) => (
                <span
                  key={p.id ?? i}
                  className={`h-1 w-6 transition-colors ${i === index ? 'bg-canvas' : 'bg-canvas/40'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {pics.length > 1 && (
        <div className="flex gap-2 mt-3 px-4 overflow-x-auto lg:justify-center">
          {pics.map((p, i) => (
            <button
              key={p.id ?? i}
              onClick={() => go(i)}
              className={`h-16 w-14 md:h-20 md:w-16 shrink-0 overflow-hidden border transition ${
                i === index ? 'border-ink' : 'border-transparent opacity-50 hover:opacity-100'
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <img src={thumb(p)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-ink/95 flex items-center justify-center p-6 cursor-zoom-out animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-label={alt}
        >
          <img src={main(pics[index])} alt={alt} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
