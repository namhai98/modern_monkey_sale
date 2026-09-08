import { useEffect, useRef, useState } from 'react';

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

// Fade + rise as the element scrolls into view — native IntersectionObserver +
// CSS transition (no JS animation library, so the content can never be left
// stranded at opacity 0 if an animation frame loop is throttled).
export default function Reveal({ children, className = '', delay = 0, y = 24, as: Tag = 'div' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // safety net: reveal after a short delay no matter what
    const fallback = setTimeout(() => setShown(true), 700);

    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setShown(true);
            io.disconnect();
          }
        },
        { rootMargin: '-10% 0px' }
      );
      io.observe(el);
    } else {
      setShown(true);
    }

    return () => {
      clearTimeout(fallback);
      io?.disconnect();
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${y}px)`,
        transition: `opacity 0.7s ${EASE} ${delay}s, transform 0.7s ${EASE} ${delay}s`,
      }}
    >
      {children}
    </Tag>
  );
}
