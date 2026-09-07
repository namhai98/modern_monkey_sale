import { Link } from 'react-router-dom';
import { resizeUnsplash } from '../lib/media';

export default function ProductCard({ product }) {
  const soldOut = product.stock <= 0;

  return (
    <Link to={`/products/${product.id}`} className="group block">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ivory">
        {product.image_url ? (
          <img
            src={resizeUnsplash(product.image_url, 800)}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <span className="font-display text-3xl text-mist">MM</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
          <span className="bg-canvas/95 text-ink eyebrow px-6 py-2.5">View</span>
        </div>

        {soldOut && (
          <span className="absolute top-3 left-3 eyebrow text-stone bg-canvas/90 px-2 py-1">
            Sold out
          </span>
        )}
      </div>

      <div className="pt-4 text-center">
        <h3 className="font-display text-xl leading-snug">{product.name}</h3>
        <p className="text-sm text-stone mt-1">
          ${Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>
    </Link>
  );
}
