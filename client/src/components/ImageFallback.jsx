import { useEffect, useState } from 'react';

// Drop-in <img> replacement. When there is no src, or the src fails to load,
// it renders a clean MM monogram on surface instead of a broken-image icon.
// The className you'd give the <img> (sizing, object-cover, transitions) is
// applied to the placeholder too, so it fills the same box.
export default function ImageFallback({ src, alt = '', className = '', ...imgProps }) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt || 'Image unavailable'}
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
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
      {...imgProps}
    />
  );
}
