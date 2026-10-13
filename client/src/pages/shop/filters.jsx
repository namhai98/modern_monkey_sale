import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../components/Icon';
import { useLocale } from '../../context/LocaleContext';

/* The presentation site has no filters, no sort and no pagination anywhere —
   its own spec says to build them out of the existing vocabulary rather than
   invent a new one. So everything below is assembled from three house parts:
   the gold eyebrow, micro-type at 0.28em, and the hairline that turns gold when
   something is active. No filled pills, no radius, no shadows. */

const GENDER_ICONS = { women: 'venus', men: 'mars', unisex: 'venusMars' };

// The rail's header and the listing's header read as one row split in two:
// same height, same type, and the same rule underneath at the same height.
export const HEAD_ROW = 'flex h-14 items-center justify-between gap-4 border-b border-line';

export const HEAD_TEXT = 'micro tracking-button text-foreground';

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
        } ${checked ? 'border-gold-fill bg-gold-fill text-ink' : disabled ? 'border-line' : 'border-muted/60'}`}
      >
        {checked && (radio ? <span className="h-1.5 w-1.5 rounded-full bg-ink" /> : <Icon name="check" className="h-3 w-3" strokeWidth={2.5} />)}
      </span>
      {icon && <Icon name={icon} className="h-4 w-4 shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count != null && <span className="shrink-0 text-xs tabular-nums text-muted">{count}</span>}
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
export function usePriceUnits() {
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
export function FilterControls({
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
export function ActiveFilters({ t, chips, clearAll }) {
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

export function FixedFilterRail({ controlProps }) {
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
