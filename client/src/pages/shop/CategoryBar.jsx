import Icon from '../../components/Icon';
import { categoryLabel } from '../../lib/i18n';
import { FixedFilterRail } from './filters';

// A line icon for each top-level category — the three the house is built on,
// plus accessories where that category exists. Anything else gets a plain tag.
const CATEGORY_ICONS = {
  watches: 'watch',
  bags: 'handbag',
  apparel: 'shirt',
  accessories: 'gem',
};

/* The category bar: the listing's top-level choice, running the full width of
   the page above everything else. Each choice leads with its line icon, gold
   with the label when active. It scrolls horizontally rather than wrapping,
   so a shop with many categories keeps its first row intact on a phone. */
export function CategoryBar({ t, locale, categories, category, onAll, patch }) {
  const item = (active) =>
    `group/cat tap-area font-catalog inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap py-1 text-meta font-medium uppercase tracking-meta transition-colors duration-300 ${active ? 'text-gold' : 'text-muted hover:text-foreground'
    }`;
  const icon = (name) => (
    <Icon name={name} className="h-[1.05rem] w-[1.05rem] shrink-0 transition-transform duration-300 group-hover/cat:-translate-y-px" />
  );

  return (
    <nav aria-label={t('shop.category')} className="border-b border-line">
      {/* A fixed height (not padding around whatever the type measures): the
          fixed filter rail below is positioned from it, see FixedFilterRail. */}
      <div className="container-bar flex h-16 items-center gap-7 overflow-x-auto lg:gap-10">
        <button
          type="button"
          onClick={() => patch({ category: '', brand: '', gender: '', all: '1' })}
          className={item(category === '' && onAll)}
        >
          {icon('grid')}
          <span className="link-lux">{t('nav.all')}</span>
        </button>
        {/* Placeholders while /categories loads, so the bar keeps its shape
            instead of showing "All" alone and then filling in. */}
        {categories.length === 0 &&
          [0, 1, 2].map((i) => (
            <span key={i} aria-hidden="true" className="inline-block h-3.5 w-20 shrink-0 animate-pulse bg-surface" />
          ))}
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => patch({ category: c.slug, brand: '', gender: '', all: '' })}
            className={item(c.slug === category)}
          >
            {icon(CATEGORY_ICONS[c.slug] || 'tag')}
            <span className="link-lux">{categoryLabel(locale, c)}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
