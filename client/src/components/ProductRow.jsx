import ProductCard from './ProductCard';
import Reveal from './Reveal';

/* A short row of products (home strips, related, recently viewed).

   On a phone it is a swipe row: cards a little under half the screen wide, so
   the next one peeks in from the edge and says "there is more this way", and
   no row ends on a single orphaned card under a pair. From md it is the
   ordinary grid, `cols` deciding how many across.

   The row bleeds to the screen edge (-mx-6 / px-6, the container's own gutter)
   so a swiped card slides off the edge rather than being cut at the margin. */
export default function ProductRow({ products, cols = 'md:grid-cols-3 lg:grid-cols-4', className = '' }) {
  return (
    <div
      className={`-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:gap-x-6 md:gap-y-14 md:overflow-visible md:px-0 md:pb-0 ${cols} ${className}`}
    >
      {products.map((p, i) => (
        <div key={p.id} className="w-[44vw] max-w-[15rem] shrink-0 snap-start md:w-auto md:max-w-none">
          <Reveal delay={Math.min(i, 3) * 0.08}>
            <ProductCard product={p} />
          </Reveal>
        </div>
      ))}
    </div>
  );
}
