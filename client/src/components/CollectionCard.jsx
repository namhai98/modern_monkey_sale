import { Link } from 'react-router-dom';
import ImageFallback from './ImageFallback';
import { useLocale } from '../context/LocaleContext';

/* The presentation site's image-overlay card, used for every collection entry
   point — the home page grid and the shop's landing page both render this one
   component rather than each keeping a near-copy.

   A 3/4 frame with a gradient foot, a gold index overline, a serif name and a
   "discover" line that fades in on hover while its arrow slides out. The media
   scales; the card does not. */
export default function CollectionCard({ to, label, index, image, meta, className = '' }) {
  const { t } = useLocale();

  return (
    <Link to={to} className={`group block ${className}`}>
      <div className="relative overflow-hidden">
        <ImageFallback
          src={image}
          alt={label}
          className="aspect-[3/4] w-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 p-6">
          {index != null && (
            <p className="micro tracking-[0.32em] text-gold">
              {String(index + 1).padStart(2, '0')}
            </p>
          )}
          <h3 className="heading-serif mt-2 text-2xl text-white md:text-3xl">{label}</h3>
          {meta && <p className="micro mt-2 tracking-[0.2em] text-white/55">{meta}</p>}
          <span className="micro mt-4 inline-flex items-center gap-2 tracking-[0.28em] text-transparent transition-colors duration-500 group-hover:text-white">
            {t('shop.explore')}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 -translate-x-2 transition-transform duration-500 group-hover:translate-x-0"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
