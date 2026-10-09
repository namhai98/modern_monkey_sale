import { Link } from 'react-router-dom';
import Icon from './Icon';
import ImageFallback from './ImageFallback';
import { useLocale } from '../context/LocaleContext';
import { unsplashSrcSet } from '../lib/media';

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
          srcSet={unsplashSrcSet(image, [500, 800, 1200])}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          alt={label}
          className="aspect-[4/3] w-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05] sm:aspect-[3/4]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 p-6">
          {index != null && (
            <p className="micro tracking-button text-gold">
              {String(index + 1).padStart(2, '0')}
            </p>
          )}
          <h3 className="heading-serif mt-2 text-2xl text-white md:text-3xl">{label}</h3>
          {meta && <p className="micro mt-2 tracking-meta text-white/55">{meta}</p>}
          <span className="micro mt-4 inline-flex items-center gap-2 tracking-label text-transparent transition-colors duration-500 group-hover:text-white">
            {t('shop.explore')}
            <Icon
              name="arrowRight"
              className="h-3.5 w-3.5 -translate-x-2 transition-transform duration-500 group-hover:translate-x-0"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
