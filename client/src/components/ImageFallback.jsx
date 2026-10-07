import { useEffect, useState } from 'react';
import { useLocale } from '../context/LocaleContext';

// Drop-in <img> replacement. When there is no src, or the src fails to load,
// it renders a clean MM monogram on surface instead of a broken-image icon.
// The className you'd give the <img> (sizing, object-cover, transitions) is
// applied to the placeholder too, so it fills the same box.
//
// Lazy by default. Pass `priority` for the one image that is the page's
// largest paint (the home hero) — it loads eagerly at high fetch priority
// instead of waiting for the lazy-load heuristics to notice it.
export default function ImageFallback({ src, alt = '', className = '', priority = false, ...imgProps }) {
  const [failed, setFailed] = useState(!src);
  const { t } = useLocale();

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt || t('image.unavailable')}
        className={`@container flex select-none items-center justify-center bg-surface text-foreground/15 ${className}`}
      >
        <span className="heading-serif text-[clamp(0.8rem,20cqw,3rem)] uppercase leading-none tracking-[0.12em]">
          MM
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
      {...imgProps}
    />
  );
}
