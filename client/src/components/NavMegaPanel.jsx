import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { categoryLabel } from '../lib/i18n';
import { homeMedia, resizeUnsplash } from '../lib/media';
import Icon from './Icon';
import { INK_COL_HEAD, INK_COL_LINK } from './inkColumn';

/* The desktop panel behind Products, unfurling full-bleed under the header on
   hover or focus.

   The three houses the shop is built on — watches, bags, apparel — lead as
   picture cards, the way a maison opens its doors; who a piece is for, which
   house made it, and what is new follow as quiet link columns on the right.
   Every link is an ordinary /shop URL the listing already understands
   (`category`, `all`, `gender`, `brand`, `sort`), so the panel is a faster
   route into filters the shop has always had.

   House rules: gold column heads, link-lux rows at white/65, hairlines and a
   blur for elevation, never a shadow; the cards never lift, only their photo
   breathes on hover. */

const GENDERS = ['women', 'men', 'unisex'];
// The house order, and the photograph each category is shown with — the same
// black-and-gold art direction as the home page.
const ORDER = ['watches', 'bags', 'apparel'];
const IMAGE = homeMedia.bands;

export default function NavMegaPanel({ categories = [], brands, onNavigate }) {
  const { t, locale } = useLocale();
  const base = '/shop?all=1';

  // Until /categories answers, show the three known houses without counts so
  // the panel opens at its full size instead of growing under the pointer.
  const known = new Map(categories.map((c) => [c.slug, c]));
  const cards = (categories.length ? ORDER.filter((s) => known.has(s)) : ORDER).map((slug) => ({
    slug,
    category: known.get(slug) || { slug, name: slug },
    count: known.get(slug)?.product_count,
  }));

  // Brands with nothing in them would be dead ends. Six keeps the column to one
  // readable block; the filter rail in the shop has the full list.
  const shown = brands.filter((b) => b.product_count > 0).slice(0, 6);

  return (
    <div className="container-bar grid grid-cols-[minmax(0,3fr)_minmax(0,1.45fr)] gap-12 py-10">
      <div className="grid grid-cols-3 gap-4">
        {cards.map(({ slug, category, count }) => (
          <Link
            key={slug}
            to={`/shop?category=${slug}`}
            onClick={onNavigate}
            className="group relative flex h-60 items-end overflow-hidden border border-white/10 transition-colors duration-500 hover:border-gold/50 min-[1440px]:h-64"
          >
            {IMAGE[slug] && (
              <img
                src={resizeUnsplash(IMAGE[slug], 700)}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-55 transition-[transform,opacity] duration-[1.1s] ease-[var(--ease-luxe)] group-hover:scale-[1.05] group-hover:opacity-75"
              />
            )}
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-transparent" />
            <span className="relative flex w-full items-end justify-between gap-3 p-5">
              <span>
                <span className="micro block tracking-button text-white">{categoryLabel(locale, category)}</span>
                {count != null && (
                  <span className="mt-1.5 block text-xs text-white/55">{t('nav.pieceCount', { n: count })}</span>
                )}
              </span>
              <Icon
                name="arrowRight"
                className="h-4 w-4 shrink-0 text-gold transition-transform duration-500 ease-[var(--ease-luxe)] group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8 border-l border-white/10 pl-10">
        <div>
          <p className={INK_COL_HEAD}>{t('filter.gender')}</p>
          <div className="mt-5 flex flex-col gap-3">
            {GENDERS.map((g) => (
              <Link key={g} to={`${base}&gender=${g}`} onClick={onNavigate} className={INK_COL_LINK}>
                {t(`gender.${g}`)}
              </Link>
            ))}
          </div>

          <p className={`${INK_COL_HEAD} mt-9`}>{t('nav.discover')}</p>
          <div className="mt-5 flex flex-col gap-3">
            <Link to={`${base}&sort=created_at:desc`} onClick={onNavigate} className={INK_COL_LINK}>
              {t('nav.newIn')}
            </Link>
            <Link to={base} onClick={onNavigate} className={`${INK_COL_LINK} inline-flex items-center gap-2 text-gold/90 hover:text-gold`}>
              {t('nav.allPieces')}
              <Icon name="arrowRight" className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div>
          <p className={INK_COL_HEAD}>{t('filter.brand')}</p>
          <div className="mt-5 flex flex-col gap-3">
            {shown.length > 0 ? (
              shown.map((b) => (
                <Link key={b.slug} to={`${base}&brand=${b.slug}`} onClick={onNavigate} className={INK_COL_LINK}>
                  {b.name}
                </Link>
              ))
            ) : (
              /* The list is fetched on first open; until it lands (or if it
                 never does) the column holds its place instead of jumping. */
              <span className="text-sm text-white/25">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
