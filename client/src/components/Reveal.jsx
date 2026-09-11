import { useEffect, useRef, useState } from 'react';

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

// Shared once-only viewport trigger: flips to true the first time the element
// scrolls into view, with a timed safety net so content can never be left
// stranded at opacity 0 if the observer never fires.
function useInView(rootMargin) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

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
        { rootMargin }
      );
      io.observe(el);
    } else {
      setShown(true);
    }

    return () => {
      clearTimeout(fallback);
      io?.disconnect();
    };
  }, [rootMargin]);

  return [ref, shown];
}

// Fade + rise as the element scrolls into view — native IntersectionObserver +
// CSS transition (no JS animation library, so the content can never be left
// stranded at opacity 0 if an animation frame loop is throttled).
//
// Travel (28px) and duration (900ms) match the presentation site's <Reveal>, as
// does the house easing curve. Grid children stagger with delay={i * 0.06–0.12}.
export default function Reveal({ children, className = '', delay = 0, y = 28, as: Tag = 'div' }) {
  const [ref, shown] = useInView('-10% 0px');

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${y}px)`,
        transition: `opacity 0.9s ${EASE} ${delay}s, transform 0.9s ${EASE} ${delay}s`,
      }}
    >
      {children}
    </Tag>
  );
}

// The presentation site's image reveal: the media settles from scale 1.12 and
// 40% opacity over 1.4s, inside an overflow-hidden frame so the overscan is
// clipped rather than spilling into the layout.
export function RevealScale({ children, className = '', delay = 0 }) {
  const [ref, shown] = useInView('-60px 0px');

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <div
        style={{
          opacity: shown ? 1 : 0.4,
          transform: shown ? 'none' : 'scale(1.12)',
          transition: `opacity 1.4s ${EASE} ${delay}s, transform 1.4s ${EASE} ${delay}s`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
