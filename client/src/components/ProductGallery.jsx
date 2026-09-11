import { useEffect, useRef, useState } from 'react';
import ImageFallback from './ImageFallback';
import IconButton from './IconButton';

function Arrow({ className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

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
      <div className={`${FRAME} flex items-center justify-center bg-surface`}>
        <span className="heading-serif text-6xl uppercase tracking-[0.12em] text-foreground/10">
          MM
        </span>
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
        className={`relative ${FRAME} overflow-hidden bg-surface`}
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
              <ImageFallback
                src={main(p)}
                alt={alt}
                width={p.width || undefined}
                height={p.height || undefined}
                className="w-full h-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </button>
          ))}
        </div>

        {pics.length > 1 && (
          <>
            {/* The round icon button is the one place radius is allowed, and
                these share the component with every other close/prev/next
                control in the storefront. */}
            <IconButton
              tone="dark"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="absolute left-4 top-1/2 hidden -translate-y-1/2 bg-ink/50 backdrop-blur disabled:opacity-0 md:flex"
              aria-label="Previous image"
            >
              <Arrow className="h-4 w-4 rotate-180" />
            </IconButton>
            <IconButton
              tone="dark"
              onClick={() => go(index + 1)}
              disabled={index === pics.length - 1}
              className="absolute right-4 top-1/2 hidden -translate-y-1/2 bg-ink/50 backdrop-blur disabled:opacity-0 md:flex"
              aria-label="Next image"
            >
              <Arrow className="h-4 w-4" />
            </IconButton>
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
              {pics.map((p, i) => (
                <span
                  key={p.id ?? i}
                  className={`h-px w-7 transition-colors duration-500 ${
                    i === index ? 'bg-gold' : 'bg-white/35'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {pics.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto px-4 lg:justify-center">
          {pics.map((p, i) => (
            <button
              key={p.id ?? i}
              onClick={() => go(i)}
              className={`h-16 w-14 shrink-0 overflow-hidden border transition-all duration-300 md:h-20 md:w-16 ${
                i === index ? 'border-gold' : 'border-transparent opacity-50 hover:opacity-100'
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <ImageFallback src={thumb(p)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox — ink scrim at 95% plus a blur, never a neutral grey. */}
      {zoom && (
        <div
          className="fixed inset-0 z-[70] flex animate-[fadeIn_0.2s_ease-out] cursor-zoom-out items-center justify-center bg-ink/95 p-6 backdrop-blur-sm"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <IconButton
            tone="dark"
            onClick={() => setZoom(false)}
            className="absolute right-5 top-5"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </IconButton>
          <figure onClick={(e) => e.stopPropagation()} className="max-h-full">
            <img
              src={main(pics[index])}
              alt={alt}
              className="max-h-[82svh] max-w-full object-contain"
            />
            <figcaption className="micro mt-5 text-center tracking-[0.24em] text-gold">
              {index + 1} / {pics.length}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
