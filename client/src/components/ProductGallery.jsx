import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from '../context/LocaleContext';
import { useFocusTrap } from '../lib/useFocusTrap';
import Icon from './Icon';
import ImageFallback from './ImageFallback';
import IconButton from './IconButton';

// Horizontal swipe: far enough, or short and quick (a flick).
function swipeDir(start, e) {
  if (!start) return 0;
  const dx = e.changedTouches[0].clientX - start.x;
  const dt = Date.now() - start.t;
  if (Math.abs(dx) > 45 || (Math.abs(dx) > 20 && dt < 250)) return dx < 0 ? 1 : -1;
  return 0;
}

/* Full-screen viewer. Portalled to <body>: the route wrapper (.page-in) is
   animated with a transform, and a transformed ancestor turns `position: fixed`
   into "fixed to that wrapper" — the scrim then covered only part of the page
   and the product details showed through on top. From <body> it covers the
   viewport, above the header. Keyboard: ←/→ step, Escape closes, Tab stays
   inside; the page underneath does not scroll while it is open. */
function Lightbox({ pics, index, alt, main, onStep, onClose }) {
  const { t } = useLocale();
  const touch = useRef(null);
  const closeRef = useRef(null);
  const dialogRef = useFocusTrap(true, { initialFocus: closeRef });
  const many = pics.length > 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onStep(1);
      else if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, onStep]);

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[90] flex animate-[fadeIn_0.2s_ease-out] cursor-zoom-out items-center justify-center bg-ink/95 p-6 outline-none backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX, t: Date.now() };
      }}
      onTouchEnd={(e) => {
        const dir = swipeDir(touch.current, e);
        if (dir) onStep(dir);
        touch.current = null;
      }}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <IconButton
        ref={closeRef}
        tone="dark"
        onClick={onClose}
        className="absolute right-5 top-5 z-30"
        aria-label={t('nav.close')}
      >
        <Icon name="x" className="h-4 w-4" />
      </IconButton>

      {many && (
        <>
          <IconButton
            tone="dark"
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
            disabled={index === 0}
            className="absolute left-4 top-1/2 z-30 -translate-y-1/2 disabled:opacity-0 max-md:hidden"
            aria-label={t('gallery.prev')}
          >
            <Icon name="arrowRight" className="h-4 w-4 rotate-180" />
          </IconButton>
          <IconButton
            tone="dark"
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
            disabled={index === pics.length - 1}
            className="absolute right-4 top-1/2 z-30 -translate-y-1/2 disabled:opacity-0 max-md:hidden"
            aria-label={t('gallery.next')}
          >
            <Icon name="arrowRight" className="h-4 w-4" />
          </IconButton>
        </>
      )}

      {many ? (
        /* Several photos: a short carousel. The current photo sits in front;
           its neighbours wait behind it on either side — smaller, softly
           blurred and dimmed — so the shopper can see there is more and where
           a swipe goes. A neighbour is a click target too. Everything further
           away fades out. --peek is how far a neighbour sits from centre.
           The full-width layers ignore the pointer and only the photos take
           it, so a neighbour's visible edge is clickable and the dark space
           around them still closes the viewer. */
        <figure className="flex h-full w-full flex-col items-center justify-center">
          <div className="relative h-[78svh] w-full [--peek:64%] md:[--peek:36%]">
            {pics.map((p, i) => {
              const d = i - index;
              const far = Math.abs(d) > 1;
              return (
                <div
                  key={p.id ?? i}
                  aria-hidden={d !== 0}
                  className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-[transform,filter,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    d === 0 ? 'z-20' : far ? 'z-0' : 'z-10'
                  }`}
                  style={{
                    transform: `translateX(calc(${Math.sign(d)} * var(--peek))) scale(${d === 0 ? 1 : 0.74})`,
                    filter: d === 0 ? 'none' : 'blur(3px) brightness(0.55)',
                    opacity: far ? 0 : 1,
                  }}
                >
                  <img
                    src={main(p)}
                    alt={d === 0 ? alt : ''}
                    loading={far ? 'lazy' : 'eager'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (d !== 0) onStep(d);
                    }}
                    className={`max-h-full max-w-[78vw] object-contain shadow-2xl shadow-black/50 md:max-w-[56vw] ${
                      far ? '' : 'pointer-events-auto'
                    } ${d === 0 ? 'cursor-default' : 'cursor-pointer'}`}
                  />
                </div>
              );
            })}
          </div>
          <figcaption onClick={(e) => e.stopPropagation()} className="micro mt-5 cursor-default text-center tracking-meta text-gold">
            {index + 1} / {pics.length}
          </figcaption>
        </figure>
      ) : (
        <figure onClick={(e) => e.stopPropagation()} className="flex max-h-full cursor-default flex-col items-center">
          <img src={main(pics[index])} alt={alt} className="max-h-[82svh] max-w-full object-contain" />
        </figure>
      )}
    </div>,
    document.body
  );
}

// `images`: [{ id, thumbnail, card, detail, width, height }]
export default function ProductGallery({ images = [], alt = '' }) {
  const { t } = useLocale();
  const pics = images.filter((p) => p && (p.detail || p.card));
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touch = useRef(null);

  useEffect(() => {
    setIndex(0);
  }, [pics.map((p) => p.id ?? p.detail).join('|')]);

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

  // native swipe (mobile) — no animation-library dependency; a tap opens the
  // full-screen viewer.
  function onTouchStart(e) {
    touch.current = { x: e.touches[0].clientX, t: Date.now() };
  }
  function onTouchEnd(e) {
    const dir = swipeDir(touch.current, e);
    if (dir) go(index + dir);
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
              type="button"
              onClick={() => setZoom(true)}
              className="h-full w-full shrink-0 cursor-zoom-in"
              aria-label={t('gallery.open')}
              tabIndex={i === index ? 0 : -1}
            >
              <ImageFallback
                src={main(p)}
                alt={alt}
                width={p.width || undefined}
                height={p.height || undefined}
                className="h-full w-full object-cover"
                priority={i === 0}
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
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-ink/50 backdrop-blur disabled:opacity-0 max-md:hidden"
              aria-label={t('gallery.prev')}
            >
              <Icon name="arrowRight" className="h-4 w-4 rotate-180" />
            </IconButton>
            <IconButton
              tone="dark"
              onClick={() => go(index + 1)}
              disabled={index === pics.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-ink/50 backdrop-blur disabled:opacity-0 max-md:hidden"
              aria-label={t('gallery.next')}
            >
              <Icon name="arrowRight" className="h-4 w-4" />
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
              type="button"
              onClick={() => go(i)}
              className={`h-16 w-14 shrink-0 overflow-hidden border transition-all duration-300 md:h-20 md:w-16 ${
                i === index ? 'border-gold' : 'border-transparent opacity-50 hover:opacity-100'
              }`}
              aria-label={t('gallery.view', { n: i + 1 })}
            >
              <ImageFallback src={thumb(p)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <Lightbox
          pics={pics}
          index={index}
          alt={alt}
          main={main}
          onStep={(d) => setIndex((i) => Math.max(0, Math.min(pics.length - 1, i + d)))}
          onClose={() => setZoom(false)}
        />
      )}
    </div>
  );
}
