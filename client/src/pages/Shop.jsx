import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import Button from '../components/Button';
import CollectionCard from '../components/CollectionCard';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import PageHero from '../components/PageHero';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import Section from '../components/Section';
import SectionHeading from '../components/SectionHeading';
import Select from '../components/Select';
import Skeleton, { ProductGridSkeleton } from '../components/Skeleton';
import TextButton from '../components/TextButton';
import { useLocale } from '../context/LocaleContext';
import { categoryLabel } from '../lib/i18n';
import { media, resizeUnsplash } from '../lib/media';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const LIMIT = 15;
const DEFAULT_SORT = 'created_at:desc';

function categoryImage(slug) {
  return media.bands[slug] || media.editorialRight;
}

/* The presentation site has no filters, no sort and no pagination anywhere —
   its own spec says to build them out of the existing vocabulary rather than
   invent a new one. So everything below is assembled from three house parts:
   the gold eyebrow, micro-type at 0.28em, and the hairline that turns gold when
   something is active. No filled pills, no radius, no shadows. */

const GENDER_ICONS = { women: 'venus', men: 'mars', unisex: 'venusMars' };

// The rail's header and the listing's header read as one row split in two:
// same height, same type, and the same rule underneath at the same height.
const HEAD_ROW = 'flex h-14 items-center justify-between gap-4 border-b border-line';
const HEAD_TEXT = 'micro tracking-button text-foreground';

/* A collapsible rail section: label left, −/+ right, a hairline above each one
   so the rail reads as a set of separate choices. Open by default — a filter a
   shopper cannot see is a filter they will not use. */
function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-left transition-colors duration-300 hover:text-gold"
      >
        <span className="micro text-foreground">{title}</span>
        <Icon name={open ? 'minus' : 'plus'} className="h-3.5 w-3.5 shrink-0 text-muted" />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

/* A row with a square tick — for on/off choices and for brands, where several
   can be on at once. `count` is how many pieces the choice would show. */
function CheckRow({ checked, disabled = false, count, onClick, children, radio = false, icon }) {
  return (
    <button
      type="button"
      role={radio ? 'radio' : 'checkbox'}
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 py-1.5 text-left text-sm transition-colors duration-300 ${
        checked ? 'text-gold' : disabled ? 'cursor-not-allowed text-muted/40' : 'text-muted hover:text-foreground'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors duration-300 ${
          radio ? 'rounded-full' : ''
        } ${checked ? 'border-gold bg-gold text-ink' : disabled ? 'border-line' : 'border-muted/60'}`}
      >
        {checked && (radio ? <span className="h-1.5 w-1.5 rounded-full bg-ink" /> : <Icon name="check" className="h-3 w-3" strokeWidth={2.5} />)}
      </span>
      {icon && <Icon name={icon} className="h-4 w-4 shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count != null && <span className="shrink-0 text-xs tabular-nums text-muted/70">{count}</span>}
    </button>
  );
}

/* Price bands, set in the currency the shopper reads. Each is stored in the
   URL in USD (what the catalogue is priced in), so a link means the same thing
   in either language; the conversion uses the live rate. */
const PRICE_BANDS = {
  mn: [[0, 1_000_000], [1_000_000, 3_000_000], [3_000_000, 6_000_000], [6_000_000, null]],
  en: [[0, 300], [300, 900], [900, 1800], [1800, null]],
};

// The display currency's conversion, both ways. In Mongolian with no rate the
// shop shows dollars (see formatMoney), so the price filter does too.
function usePriceUnits() {
  const { locale, mntRate } = useLocale();
  const rate = Number(mntRate);
  const mnt = locale === 'mn' && Number.isFinite(rate) && rate > 0;
  return {
    mnt,
    bands: mnt ? PRICE_BANDS.mn : PRICE_BANDS.en,
    toUsd: (v) => (v == null ? null : Math.round((mnt ? v / rate : v) * 100) / 100),
    fromUsd: (v) => (v == null ? null : mnt ? Math.round((v * rate) / 1000) * 1000 : Math.round(v)),
    fmt: (v) => (mnt ? `${v.toLocaleString('en-US')}₮` : `$${v.toLocaleString('en-US')}`),
    // Compact band labels: "1 сая" rather than 1,000,000₮.
    short: (v) =>
      mnt
        ? v >= 1_000_000
          ? `${(v / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })} сая`
          : `${(v / 1000).toLocaleString('en-US')} мянга`
        : `$${v.toLocaleString('en-US')}`,
  };
}

function bandLabel(t, units, [lo, hi]) {
  if (!lo) return t('filter.priceUnder', { v: units.short(hi) });
  if (hi == null) return t('filter.priceOver', { v: units.short(lo) });
  return `${units.short(lo)} – ${units.short(hi)}`;
}

/* Price: four quick bands, or any range typed in. The fields commit on blur or
   Enter, not per keystroke, so typing "1500000" doesn't run seven searches. */
function PriceFilter({ t, pmin, pmax, span, patch }) {
  const units = usePriceUnits();
  const minId = useId();
  const maxId = useId();
  const [draft, setDraft] = useState({ min: '', max: '' });

  // The fields mirror the URL, in the shopper's currency.
  useEffect(() => {
    setDraft({
      min: pmin != null ? units.fromUsd(pmin).toLocaleString('en-US') : '',
      max: pmax != null ? units.fromUsd(pmax).toLocaleString('en-US') : '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pmin, pmax, units.mnt]);

  const commit = () => {
    const parse = (s) => {
      const n = Number(String(s).replace(/[^\d.]/g, ''));
      return s !== '' && Number.isFinite(n) && n > 0 ? n : null;
    };
    let lo = parse(draft.min);
    let hi = parse(draft.max);
    if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
    patch({ pmin: units.toUsd(lo) ?? '', pmax: units.toUsd(hi) ?? '' });
  };

  const bandOn = ([lo, hi]) =>
    (pmin ?? null) === (lo ? units.toUsd(lo) : null) && (pmax ?? null) === units.toUsd(hi);

  return (
    <div>
      <div role="radiogroup" aria-label={t('filter.price')}>
        {units.bands.map((band) => {
          const on = bandOn(band);
          return (
            <CheckRow
              key={band.join('-')}
              radio
              checked={on}
              onClick={() =>
                on
                  ? patch({ pmin: '', pmax: '' })
                  : patch({ pmin: band[0] ? units.toUsd(band[0]) : '', pmax: band[1] != null ? units.toUsd(band[1]) : '' })
              }
            >
              {bandLabel(t, units, band)}
            </CheckRow>
          );
        })}
      </div>

      <div className="mt-4 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor={minId} className="micro mb-1 block text-muted">{t('filter.priceMin')}</label>
          <input
            id={minId}
            inputMode="numeric"
            value={draft.min}
            placeholder="0"
            onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            className="field tabular-nums"
          />
        </div>
        <span className="pb-3 text-muted" aria-hidden="true">–</span>
        <div className="min-w-0 flex-1">
          <label htmlFor={maxId} className="micro mb-1 block text-muted">{t('filter.priceMax')}</label>
          <input
            id={maxId}
            inputMode="numeric"
            value={draft.max}
            placeholder="∞"
            onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            className="field tabular-nums"
          />
        </div>
      </div>
      {span?.min != null && span?.max != null && (
        <p className="mt-3 text-xs text-muted">
          {t('filter.priceSpan', { min: units.fmt(units.fromUsd(span.min)), max: units.fmt(units.fromUsd(span.max)) })}
        </p>
      )}
    </div>
  );
}

/* The filter rail body — shared by the desktop column and the mobile drawer.
   Category is NOT here: it runs along the top of the page as its own bar, so
   the rail is left to the refinements that narrow a category. `showHead` is
   off in the drawer, which has a header of its own. */
function FilterControls({
  t, brands, gender, sale, inStock, pmin, pmax, q, qDraft, setQDraft, facets, allFacets, patch, clearAll, showHead = true,
}) {
  // The rail can be mounted twice at once (hidden desktop rail + open mobile
  // drawer), so the input's id has to be unique per instance.
  const searchId = useId();
  // Every option the category has stays listed (`allFacets`), so ticking Sale
  // or picking a brand never makes the other sections vanish. What the current
  // selection actually contains (`facets`) decides which are live and their
  // counts; the rest are greyed out rather than removed.
  const genderOptions = allFacets.genders.length ? allFacets.genders : facets.genders;
  const brandOptions = allFacets.brands.length ? allFacets.brands : facets.brands;
  const genderCount = new Map(facets.genders.map((g) => [g.value, g.count]));
  const brandCount = new Map(facets.brands.map((b) => [b.slug, b.count]));
  const anyActive = Boolean(brands.length || gender || sale || inStock || q || pmin != null || pmax != null);
  const toggleBrand = (slug) =>
    patch({ brand: (brands.includes(slug) ? brands.filter((b) => b !== slug) : [...brands, slug]).join(',') });

  return (
    <div className="space-y-8">
      {showHead && (
        /* Clear sits in the header, not at the foot of the rail — it stays in
           reach however long the brand list grows. */
        <div className={HEAD_ROW}>
          <span className="flex items-center gap-2.5">
            <Icon name="filter" className="h-4 w-4 text-gold" />
            <span className={HEAD_TEXT}>{t('shop.filters')}</span>
          </span>
          {anyActive && (
            <button type="button" onClick={clearAll} className="link-lux micro text-gold">
              {t('shop.clear')}
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <label htmlFor={searchId} className="sr-only">{t('shop.search')}</label>
        <Icon name="search" className="pointer-events-none absolute bottom-3.5 left-0 h-4 w-4 text-muted" />
        <input
          id={searchId}
          type="search"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          placeholder={t('filter.searchPlaceholder')}
          className="field pl-7 pr-7"
        />
        {qDraft && (
          <button
            type="button"
            onClick={() => {
              setQDraft('');
              patch({ q: '' });
            }}
            aria-label={t('shop.clear')}
            className="absolute bottom-3 right-0 text-muted transition-colors hover:text-gold"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        <FilterSection title={t('filter.availability')}>
          <CheckRow checked={sale} onClick={() => patch({ sale: sale ? '' : '1' })}>
            {t('filter.onSale')}
          </CheckRow>
          <CheckRow checked={inStock} onClick={() => patch({ stock: inStock ? '' : '1' })}>
            {t('filter.inStock')}
          </CheckRow>
        </FilterSection>

        <FilterSection title={t('filter.price')}>
          <PriceFilter t={t} pmin={pmin} pmax={pmax} span={facets.price} patch={patch} />
        </FilterSection>

        {genderOptions.length > 0 && (
          <FilterSection title={t('filter.gender')}>
            {/* Icon and word together — the icons alone read as a puzzle —
                in the same row style as brands, one choice at a time. */}
            <div role="radiogroup" aria-label={t('filter.gender')}>
              {[{ value: '', all: true }, ...genderOptions].map((g) => {
                const active = gender === g.value;
                const count = g.all ? null : genderCount.get(g.value) ?? 0;
                return (
                  <CheckRow
                    key={g.value || 'all'}
                    radio
                    checked={active}
                    disabled={!g.all && !active && count === 0}
                    count={count}
                    icon={g.all ? 'users' : GENDER_ICONS[g.value] || 'users'}
                    onClick={() => patch({ gender: g.value })}
                  >
                    {g.all ? t('filter.all') : t(`gender.${g.value}`)}
                  </CheckRow>
                );
              })}
            </div>
          </FilterSection>
        )}

        {brandOptions.length > 0 && (
          <FilterSection title={t('filter.brand')}>
            {/* A ticked list, so several houses can be compared at once, each
                with how many pieces it would add. */}
            <div>
              {brandOptions.map((b) => {
                const on = brands.includes(b.slug);
                const count = brandCount.get(b.slug) ?? 0;
                return (
                  <CheckRow key={b.slug} checked={on} disabled={!on && count === 0} count={count} onClick={() => toggleBrand(b.slug)}>
                    {b.name}
                  </CheckRow>
                );
              })}
            </div>
          </FilterSection>
        )}
      </div>
    </div>
  );
}

/* The choices in force, above the grid, each with its own ×. Removing one is a
   click where it is read, not a trip back to the rail. */
function ActiveFilters({ t, chips, clearAll }) {
  if (chips.length === 0) return null;
  return (
    <div className="-mt-3 mb-8 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.remove}
          aria-label={t('filter.remove', { name: c.label })}
          className="micro inline-flex items-center gap-2 border border-gold/40 px-3 py-1.5 tracking-meta text-foreground transition-colors duration-300 hover:border-gold hover:text-gold"
        >
          {c.label}
          <Icon name="x" className="h-3 w-3 text-muted" />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={clearAll} className="link-lux micro ml-2 text-muted hover:text-gold">
          {t('shop.clear')}
        </button>
      )}
    </div>
  );
}

// Space kept between the rail's last control and the top of the footer.
const RAIL_FOOTER_GAP = 32;

function FixedFilterRail({ controlProps }) {
  const railRef = useRef(null);

  /* A fixed rail knows nothing about the page under it, so at the end of the
     listing it would slide over the footer. Once the footer's top edge climbs
     past the rail's bottom, push the rail up by the overlap — it then scrolls
     away with the page like the end of a sticky element. */
  useEffect(() => {
    const rail = railRef.current;
    const panel = rail?.firstElementChild;
    const footer = document.querySelector('footer');
    if (!rail || !panel || !footer) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      const railBottom = parseFloat(getComputedStyle(rail).top) + panel.offsetHeight;
      const overlap = railBottom + RAIL_FOOTER_GAP - footer.getBoundingClientRect().top;
      rail.style.transform = overlap > 0 ? `translateY(${-overlap}px)` : '';
      // Publish the rail's height so the listing can be at least that tall:
      // on a short listing (a few results, an empty state) the footer would
      // otherwise sit so high that the rail has to climb into the header.
      document.documentElement.style.setProperty('--shop-rail-h', `${panel.offsetHeight}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Facets loading, sections folding and the grid growing all move things.
    const resize = new ResizeObserver(schedule);
    resize.observe(panel);
    resize.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      resize.disconnect();
      document.documentElement.style.removeProperty('--shop-rail-h');
    };
  }, []);

  return createPortal(
    /* Top-aligned with the listing's count/sort row — header + the 4rem
       category bar and its 1px rule + the listing's 2rem top padding — so the
       two header rows and their rules meet on one line. Not centred — a centred rail
       left a band of empty space above it. Still fixed, so it stays put while
       the grid scrolls; bottom-0 + overflow-y-auto let a long brand list scroll
       inside the rail instead of running off the screen. The frame itself is
       click-through (pointer-events-none) so the empty strip below the panel
       never blocks the footer links it passes over; only the panel takes
       clicks. */
    <div
      ref={railRef}
      className="pointer-events-none fixed left-8 top-[calc(var(--header-h)+6rem+1px)] bottom-0 hidden w-60 lg:flex lg:items-start xl:left-12 xl:w-[17rem]"
    >
      <div className="pointer-events-auto max-h-full w-full overflow-y-auto pb-6 pr-8 xl:pr-10">
        <FilterControls {...controlProps} />
      </div>
    </div>,
    document.body
  );
}

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
function CategoryBar({ t, locale, categories, category, onAll, patch }) {
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

/* "All" landing: pick a collection, or search. */
function CategoryChooser({ categories }) {
  const { t, locale } = useLocale();
  useDocumentTitle(t('shop.collection'));
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  function submit(e) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop?all=1');
  }

  return (
    <>
      <PageHero
        eyebrow={t('shop.allPieces')}
        title={t('shop.collection')}
        lead={t('shop.choose')}
        crumbs={[{ label: t('shop.collection') }]}
      >
        <form onSubmit={submit} className="mt-10 max-w-md">
          <label htmlFor="shop-search" className="micro mb-2 block text-muted">
            {t('shop.search')}
          </label>
          <input
            id="shop-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('shop.search')}
            className="field"
          />
        </form>
        <div className="mt-8 flex flex-wrap gap-5">
          <Button to="/shop?all=1">{t('shop.everything')}</Button>
          <Button to="/shop?sale=1" variant="outline">
            {t('nav.sale')}
          </Button>
        </div>
      </PageHero>

      <Section>
        <SectionHeading
          eyebrow={t('home.collections.eyebrow')}
          title={t('home.collections.title')}
          align="center"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:mt-16 lg:grid-cols-3">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.1} className={i % 2 === 1 ? 'lg:mt-12' : ''}>
              <CollectionCard
                to={`/shop?category=${c.slug}`}
                label={categoryLabel(locale, c)}
                index={i}
                image={resizeUnsplash(categoryImage(c.slug), 1200)}
                meta={t('shop.pieces', { n: c.product_count })}
              />
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}

/* Listing: a filter rail and a grid, with every control's state living in the
   URL. None of that logic changed here — only what it looks like. */
function Listing({ categories }) {
  const { t, locale } = useLocale();
  const [params, setParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const brand = params.get('brand') || '';
  // Several brands at once, comma-separated in the URL.
  const brands = useMemo(() => brand.split(',').filter(Boolean), [brand]);
  const gender = params.get('gender') || '';
  const sale = params.get('sale') === '1';
  const inStock = params.get('stock') === '1';
  // Price bounds, in USD (what the catalogue is priced in).
  const numParam = (k) => {
    const n = Number(params.get(k));
    return params.get(k) && Number.isFinite(n) && n >= 0 ? n : null;
  };
  const pmin = numParam('pmin');
  const pmax = numParam('pmax');
  // Drives the category bar's "All" state — the listing is the all view when no
  // category is chosen and ?all=1 is what brought us here.
  const onAll = params.get('all') === '1';
  const sort = params.get('sort') || DEFAULT_SORT;
  // Pages load one under another as the shopper scrolls, so the page count is
  // the list's own state, not part of the URL.
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef(null);
  // Cards at or past this index arrived with "load more" and make an entrance;
  // earlier ones are already on screen.
  const appendFrom = useRef(0);

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState({ brands: [], genders: [], price: null });
  const [allFacets, setAllFacets] = useState({ brands: [], genders: [] });
  const [loading, setLoading] = useState(true);
  // Whether a result has ever landed. It separates "the page is still empty"
  // from "this filter refines a list already on screen" — the first deserves a
  // skeleton, the second must never take the grid away.
  const [loaded, setLoaded] = useState(false);
  const requestRef = useRef(0);
  // True only while the very first grid is being painted. The first list to
  // appear on an empty page earns its staggered entrance; every list after it
  // is a refinement of something already on screen and must simply be there.
  const firstPaint = useRef(true);

  const activeCat = categories.find((c) => c.slug === category);

  // One writer for every control. An old ?page= link is dropped — the list
  // now grows by scrolling instead.
  const patch = useCallback(
    (changes) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v === '' || v == null) next.delete(k);
          else next.set(k, String(v));
        }
        next.delete('page');
        return next;
      });
    },
    [setParams]
  );

  // Debounced search box — mirrors ?q= but doesn't hammer history on each keypress
  const [qDraft, setQDraft] = useState(q);
  useEffect(() => {
    setQDraft(q);
  }, [q]);
  useEffect(() => {
    if (qDraft.trim() === q) return undefined;
    const id = setTimeout(() => patch({ q: qDraft.trim() }), 300);
    return () => clearTimeout(id);
  }, [qDraft, q, patch]);

  // Lock body scroll while the mobile filter drawer is open, and put the
  // shopper back where they were when it closes. overflow:hidden alone collapses
  // the scrollable area and loses the position — which used to go unnoticed
  // because every filter change scrolled to the top regardless. The fixed-body
  // approach is the same one the navbar menu uses, and it is the one iOS Safari
  // actually honours.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const scrollY = window.scrollY;
    const { style } = document.body;
    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
    style.overflow = 'hidden';
    return () => {
      style.position = '';
      style.top = '';
      style.left = '';
      style.right = '';
      style.width = '';
      style.overflow = '';
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  }, [drawerOpen]);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setDrawerOpen(false);
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    mq.addEventListener('change', onChange);
    window.addEventListener('keydown', onKey);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const SORTS = useMemo(
    () => [
      { value: 'created_at:desc', label: t('sort.newest') },
      { value: 'price:asc', label: t('sort.priceAsc') },
      { value: 'price:desc', label: t('sort.priceDesc') },
      { value: 'name:asc', label: t('sort.name') },
    ],
    [t]
  );

  // The category's full option list, independent of every other filter — the
  // rail lists these always and greys out the ones the selection lacks.
  useEffect(() => {
    client
      .get('/products/facets', { params: category ? { category } : {} })
      .then((res) => setAllFacets(res.data))
      .catch(() => setAllFacets({ brands: [], genders: [] }));
  }, [category]);

  useEffect(() => {
    client
      .get('/products/facets', {
        params: {
          ...(category ? { category } : {}),
          ...(q ? { search: q } : {}),
          ...(sale ? { on_sale: 1 } : {}),
          ...(inStock ? { in_stock: 1 } : {}),
          // Sent so each facet narrows by the *other* ones (the server counts a
          // facet under every filter but its own) — no choice leads to an empty
          // page, and a selected option that has run dry still comes back.
          ...(brand ? { brand } : {}),
          ...(gender ? { gender } : {}),
          ...(pmin != null ? { price_min: pmin } : {}),
          ...(pmax != null ? { price_max: pmax } : {}),
        },
      })
      .then((res) => setFacets(res.data))
      .catch(() => setFacets({ brands: [], genders: [], price: null }));
  }, [category, q, sale, inStock, brand, gender, pmin, pmax]);

  const fetchPage = useCallback(
    (n) => {
      const [field, order] = sort.split(':');
      return client.get('/products', {
        params: {
          ...(category ? { category } : {}),
          ...(q ? { search: q } : {}),
          ...(brand ? { brand } : {}),
          ...(gender ? { gender } : {}),
          ...(sale ? { on_sale: 1 } : {}),
          ...(inStock ? { in_stock: 1 } : {}),
          ...(pmin != null ? { price_min: pmin } : {}),
          ...(pmax != null ? { price_max: pmax } : {}),
          sort: field,
          order,
          page: n,
          limit: LIMIT,
        },
      });
    },
    [category, q, brand, gender, sale, inStock, pmin, pmax, sort]
  );

  // A new selection starts the list again from its first page. Two filter
  // clicks in quick succession start two requests that can land out of order,
  // so only the newest generation may write — and a "load more" still in
  // flight from the old list is dropped the same way.
  useEffect(() => {
    const request = (requestRef.current += 1);
    setLoading(true);
    setLoadMoreFailed(false);
    fetchPage(1)
      .then((res) => {
        if (request !== requestRef.current) return;
        appendFrom.current = Infinity; // a refinement replaces; nothing animates in
        setProducts(res.data.items);
        setTotal(res.data.total);
        setPage(1);
        setLoaded(true);
      })
      .catch(() => {
        // Leave the list a shopper is reading on screen rather than blanking it
        // over a dropped request; the next filter change retries.
      })
      .finally(() => {
        if (request === requestRef.current) setLoading(false);
      });
  }, [fetchPage]);

  // The next page, added under the cards already on screen.
  const hasMore = loaded && products.length < total;
  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || loading || !hasMore) return;
    const request = requestRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    fetchPage(page + 1)
      .then((res) => {
        if (request !== requestRef.current) return;
        setProducts((prev) => {
          appendFrom.current = prev.length; // only the new cards make an entrance
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...res.data.items.filter((p) => !seen.has(p.id))];
        });
        setTotal(res.data.total);
        setPage((n) => n + 1);
      })
      .catch(() => request === requestRef.current && setLoadMoreFailed(true))
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [fetchPage, page, loading, hasMore]);

  // Load the next page as the end of the grid comes near — well before the
  // shopper reaches it, so on an ordinary scroll the cards are already there.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadMoreFailed || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: '0px 0px 800px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, loadMoreFailed]);

  // Runs after the render in which `loaded` first turns true — so that render,
  // the one that paints the first grid, still sees firstPaint.current === true.
  useEffect(() => {
    if (loaded) firstPaint.current = false;
  }, [loaded]);
  const heading = activeCat
    ? categoryLabel(locale, activeCat)
    : q
      ? `“${q}”`
      : sale && !category
        ? t('nav.sale')
        : t('shop.collection');
  useDocumentTitle(heading);
  const clearAll = useCallback(() => {
    setQDraft('');
    patch({ brand: '', gender: '', sale: '', stock: '', pmin: '', pmax: '', q: '' });
  }, [patch]);

  // One chip per choice in force, each removable on its own.
  const priceUnits = usePriceUnits();
  const brandName = (slug) => allFacets.brands.find((b) => b.slug === slug)?.name || facets.brands.find((b) => b.slug === slug)?.name || slug;
  const chips = [
    ...(q ? [{ key: 'q', label: `“${q}”`, remove: () => { setQDraft(''); patch({ q: '' }); } }] : []),
    ...(sale ? [{ key: 'sale', label: t('filter.onSale'), remove: () => patch({ sale: '' }) }] : []),
    ...(inStock ? [{ key: 'stock', label: t('filter.inStock'), remove: () => patch({ stock: '' }) }] : []),
    ...(pmin != null || pmax != null
      ? [{
          key: 'price',
          label:
            pmax == null
              ? t('filter.priceOver', { v: priceUnits.fmt(priceUnits.fromUsd(pmin)) })
              : pmin == null
                ? t('filter.priceUnder', { v: priceUnits.fmt(priceUnits.fromUsd(pmax)) })
                : `${priceUnits.fmt(priceUnits.fromUsd(pmin))} – ${priceUnits.fmt(priceUnits.fromUsd(pmax))}`,
          remove: () => patch({ pmin: '', pmax: '' }),
        }]
      : []),
    ...(gender ? [{ key: 'gender', label: t(`gender.${gender}`), remove: () => patch({ gender: '' }) }] : []),
    ...brands.map((b) => ({
      key: `brand-${b}`,
      label: brandName(b),
      remove: () => patch({ brand: brands.filter((x) => x !== b).join(',') }),
    })),
  ];
  const activeCount = chips.length;
  const controlProps = {
    t, brands, gender, sale, inStock, pmin, pmax, q, qDraft, setQDraft, facets, allFacets, patch, clearAll,
  };

  return (
    <>
      {/* The listing is arranged as a working browse page rather than an
          editorial opener: category bar across the top, then the filter rail
          and the grid side by side — all on the full-bleed rail so a wide
          screen is spent on products. The house vocabulary is unchanged
          throughout: micro type at 0.28em, gold for what is active, hairlines
          for every division, no pills, no radius, no shadows. */}
      <CategoryBar
        t={t}
        locale={locale}
        categories={categories}
        category={category}
        onAll={onAll}
        patch={patch}
      />

      {/* lg:min-h — at least as tall as the fixed rail (its height + the
          rail's offset below this block's top + the footer gap), so the
          footer always starts below the rail, never under it. */}
      <div className="container-bar pt-8 pb-10 md:pb-12 lg:min-h-[calc(var(--shop-rail-h,0px)+4.5rem)]">
        <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10 xl:grid-cols-[17rem_1fr] xl:gap-14">
          <aside className="hidden lg:block" />

          <FixedFilterRail controlProps={controlProps} />

          <div className="min-w-0">
            <div className={`${HEAD_ROW} mb-8`}>
                <h1 className={`${HEAD_TEXT} min-w-0 truncate`}>
                  {t('shop.pieces', { n: total })}
                </h1>

                <div className="flex shrink-0 items-center gap-4 sm:gap-5">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="tap-area micro inline-flex items-center gap-1.5 transition-colors duration-300 hover:text-gold lg:hidden"
                  >
                    <Icon name="filter" className="h-3.5 w-3.5" />
                    {t('shop.filters')}
                    {activeCount > 0 && <span className="text-gold">({activeCount})</span>}
                  </button>
                  <div className="flex items-center">
                    {/* No visible "Sort" label — the chosen order speaks for
                        itself; screen readers still hear what the control is. */}
                    <Select
                      id="listing-sort"
                      aria-label={t('shop.sortBy')}
                      bare
                      className="shrink-0"
                      value={sort}
                      onChange={(e) =>
                        patch({ sort: e.target.value === DEFAULT_SORT ? '' : e.target.value })
                      }
                    >
                      {SORTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
            </div>
            <ActiveFilters t={t} chips={chips} clearAll={clearAll} />
            <div>
              {!loaded ? (
                <ProductGridSkeleton />
              ) : products.length === 0 && sale && chips.length === 1 ? (
                /* Sale on its own came back empty: there is simply no active
                   discount right now. Say that, and offer the same listing
                   without the sale filter rather than a reset of everything. */
                <EmptyState
                  inline
                  eyebrow={t('nav.sale')}
                  title={t('shop.saleEmpty')}
                  body={t('shop.saleEmptyHint')}
                  actions={
                    /* Keep the category if there is one; with none, `all=1` keeps
                       us on the full listing instead of the category chooser. */
                    <Button variant="outline-dark" onClick={() => patch({ sale: '', ...(category ? {} : { all: '1' }) })}>
                      {t('shop.everything')}
                    </Button>
                  }
                />
              ) : products.length === 0 ? (
                <EmptyState
                  inline
                  eyebrow={t('shop.collection')}
                  title={q ? t('search.none', { q }) : t('shop.empty')}
                  body={t('shop.emptyHint')}
                  actions={
                    <Button
                      variant="outline-dark"
                      onClick={() => {
                        // One URL write: two in the same tick can overwrite each other.
                        setQDraft('');
                        patch({ brand: '', gender: '', sale: '', stock: '', pmin: '', pmax: '', q: '', category: '', all: '1' });
                      }}
                    >
                      {t('shop.everything')}
                    </Button>
                  }
                />
              ) : (
                <div
                  aria-busy={loading}
                  className={`grid grid-cols-2 gap-x-6 gap-y-12 transition-opacity duration-300 ease-[var(--ease-luxe)] md:grid-cols-3 md:gap-y-16 xl:grid-cols-4 min-[106.25rem]:grid-cols-5 ${loading ? 'opacity-45' : 'opacity-100'
                    }`}
                >
                  {products.map((p, i) => (
                    <Reveal
                      key={p.id}
                      delay={(i % 4) * 0.06}
                      startShown={!firstPaint.current && i < appendFrom.current}
                    >
                      <ProductCard product={p} />
                    </Reveal>
                  ))}
                  {/* The next page's places, held open while it loads — the
                      cards then land exactly where these stand. */}
                  {loadingMore &&
                    Array.from({ length: Math.min(4, total - products.length) }).map((_, i) => (
                      <div key={`more-${i}`} aria-hidden="true">
                        <Skeleton className="aspect-[4/5] w-full" />
                        <Skeleton className="mt-5 h-4 w-2/3" />
                        <Skeleton className="mt-2 h-3 w-1/3" />
                      </div>
                    ))}
                </div>
              )}
            </div>

            {loaded && products.length > 0 && (
              <div className="mt-14 flex flex-col items-center gap-5 border-t border-line pt-8 text-center md:mt-16">
                {/* How far through the selection the shopper is. */}
                <p className="micro tracking-meta text-muted" aria-live="polite">
                  {hasMore
                    ? t('shop.showing', { n: products.length, total })
                    : t('shop.seenAll', { n: total })}
                </p>
                {hasMore && (
                  <div className="h-px w-40 overflow-hidden bg-line" aria-hidden="true">
                    <div className="h-full bg-gold transition-[width] duration-500" style={{ width: `${(products.length / total) * 100}%` }} />
                  </div>
                )}
                {/* Scrolling loads the next page on its own; the button is for a
                    keyboard, for a failed request, and for a browser without
                    IntersectionObserver. */}
                {hasMore && !loadingMore && (
                  <TextButton onClick={loadMore}>
                    {loadMoreFailed ? t('shop.loadMoreRetry') : t('shop.loadMore')}
                  </TextButton>
                )}
                {loadingMore && <p className="micro tracking-meta text-gold">{t('shop.loadingMore')}</p>}
                <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer — ink scrim plus blur, panel held by a hairline. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 animate-[fadeIn_0.25s_ease-out] bg-ink/80 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('shop.filters')}
            className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col border-r border-line bg-background"
          >
            <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-line px-6">
              <span className="eyebrow">{t('shop.filters')}</span>
              <span className="flex items-center gap-5">
                {activeCount > 0 && (
                  <button type="button" onClick={clearAll} className="link-lux micro text-gold">
                    {t('shop.clear')}
                  </button>
                )}
                <TextButton onClick={() => setDrawerOpen(false)}>{t('nav.close')}</TextButton>
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-8">
              <FilterControls {...controlProps} showHead={false} />
            </div>
            <div className="shrink-0 border-t border-line p-5">
              <Button full className="font-catalog" onClick={() => setDrawerOpen(false)}>
                {t('shop.pieces', { n: total })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Shop() {
  const [params] = useSearchParams();
  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const all = params.get('all') === '1';
  const sale = params.get('sale') === '1';
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    client
      .get('/categories')
      // A category with nothing in it is a dead end in the bar and the chooser,
      // so it stays hidden until it has products.
      .then((res) => setCategories(res.data.filter((c) => (c.product_count ?? 1) > 0)))
      .catch(() => { });
  }, []);

  if (!category && !q && !all && !sale) return <CategoryChooser categories={categories} />;
  return <Listing categories={categories} />;
}
