import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

// Fade + rise as the element scrolls into view. Quiet, once only.
// Falls back to visible after a short delay so content is never stranded
// if the IntersectionObserver never fires (background tabs, odd layouts).
export default function Reveal({ children, className, delay = 0, y = 24, as = 'div' }) {
  const MotionTag = motion[as] || motion.div;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setForced(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const show = inView || forced;

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.7, delay: show ? delay : 0, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}
