import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import Icon from './Icon';

/* The desktop panel behind Products, unfurling full-bleed under the header on
   hover or focus.

   It offers ways INTO the catalogue that are not categories — who a piece is
   for, which house made it — because the header no longer sorts the shop by
   category. Every link is an ordinary /shop URL the listing already understands
   (`all`, `gender`, `brand`, `sale`, `sort`), so the panel is a faster route to
   filters the shop has always had, not a new navigation surface. Nothing about
   routing or filtering changed to make it work.

   Composition follows the house rules: gold 0.32em column heads, link-lux rows
   at white/65, a single hairline between the columns and the editorial plate —
   elevation by border and blur, never by shadow. */

const GENDERS = ['women', 'men', 'unisex'];
const COL_HEAD = 'micro tracking-[0.32em] text-gold';
const COL_LINK = 'link-lux w-fit text-sm text-white/65 transition-colors duration-300 hover:text-white';

export default function NavMegaPanel({ brands, onNavigate }) {
  const { t } = useLocale();
  const base = '/shop?all=1';

  // Brands with nothing in them would be dead ends. Six keeps the column to one
  // readable block; the filter rail in the shop has the full list.
  const shown = brands.filter((b) => b.product_count > 0).slice(0, 6);

  return (
    <div className="container-bar grid grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.15fr)] gap-10 py-10">
      <div>
        <p className={COL_HEAD}>{t('filter.gender')}</p>
        <div className="mt-5 flex flex-col gap-3">
          {GENDERS.map((g) => (
            <Link key={g} to={`${base}&gender=${g}`} onClick={onNavigate} className={COL_LINK}>
              {t(`gender.${g}`)}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p className={COL_HEAD}>{t('filter.brand')}</p>
        <div className="mt-5 flex flex-col gap-3">
          {shown.length > 0 ? (
            shown.map((b) => (
              <Link
                key={b.slug}
                to={`${base}&brand=${b.slug}`}
                onClick={onNavigate}
                className={COL_LINK}
              >
                {b.name}
              </Link>
            ))
          ) : (
            /* The list is fetched on first open; until it lands (or if it never
               does) the column holds its height instead of the panel jumping. */
            <span className="text-sm text-white/25">—</span>
          )}
        </div>
      </div>

      <div>
        <p className={COL_HEAD}>{t('nav.discover')}</p>
        <div className="mt-5 flex flex-col gap-3">
          <Link to={base} onClick={onNavigate} className={COL_LINK}>
            {t('nav.products')}
          </Link>
          <Link
            to={`${base}&sort=created_at&order=desc`}
            onClick={onNavigate}
            className={COL_LINK}
          >
            {t('nav.newIn')}
          </Link>
          <Link to={`${base}&sale=1`} onClick={onNavigate} className={`${COL_LINK} text-gold/80 hover:text-gold`}>
            {t('nav.sale')}
          </Link>
        </div>
      </div>

      {/* The editorial plate. A mega menu on a luxury site is a window, not a
          sitemap — one image carries more of the house than a fourth column of
          links would. */}
      <Link
        to="/shop?all=1"
        onClick={onNavigate}
        className="group relative flex min-h-[13rem] items-end overflow-hidden border-l border-white/10 pl-10"
      >
        <span className="absolute inset-y-0 left-10 right-0 overflow-hidden">
          <img
            src="/home/banner.jpg"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-45 transition-[transform,opacity] duration-[1.1s] ease-[var(--ease-luxe)] group-hover:scale-[1.04] group-hover:opacity-60"
          />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        </span>
        <span className="relative p-6">
          <span className="eyebrow block">{t('home.house.eyebrow')}</span>
          <span className="heading-serif mt-3 block max-w-[16rem] text-xl leading-snug text-white">
            {t('home.atelier.title')}
          </span>
          <span className="micro mt-4 inline-flex items-center gap-2 text-gold">
            {t('home.house.cta')}
            <Icon
              name="arrowRight"
              className="h-3.5 w-3.5 transition-transform duration-500 ease-[var(--ease-luxe)] group-hover:translate-x-1"
            />
          </span>
        </span>
      </Link>
    </div>
  );
}
