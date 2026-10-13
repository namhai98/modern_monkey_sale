import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useWishlist } from '../context/WishlistContext';
import { categoryLabel } from '../lib/i18n';
import { homeMedia, resizeUnsplash } from '../lib/media';
import { site, telHref } from '../lib/site';
import Button from './Button';
import Icon from './Icon';
import LangSwitch from './LangSwitch';
import { houseCards } from './NavMegaPanel';
import ThemeToggle from './ThemeToggle';

const STAFF_ROLES = ['staff', 'manager', 'admin'];
const SHOP_ALL = '/shop?all=1';
const GENDERS = ['women', 'men', 'unisex'];

/* The menu behind the hamburger, on phones and tablets alike — the small-screen
   twin of the desktop Products panel (NavMegaPanel), in the same order: the
   three houses as picture bands, then who a piece is for and what is new as
   chips, then the shopper's own rows, then the settings touched once a year.

   Ordered for the hand that holds the device: browsing sits in the upper middle
   where a thumb rests, account and settings at the bottom. Every row is at least
   48px tall with a full-bleed hit area. */

const SECTION_HEAD = 'micro text-white/45';
// A chip in the one-line strip under the houses. 44px tall for a thumb.
const CHIP =
  'inline-flex min-h-11 shrink-0 items-center border px-4 text-xs tracking-meta transition-colors duration-300';
const ROW =
  'flex min-h-12 w-full items-center gap-4 text-[0.95rem] transition-colors duration-300 hover:text-gold';
const ROW_ICON = 'h-[1.1rem] w-[1.1rem] shrink-0';
const SETTING_ROW = 'flex min-h-12 items-center justify-between gap-6';

/* ThemeToggle is sized for a desktop header — a 36px disc. In a menu meant for
   thumbs it needs 44px, and this descendant selector is how to say so from the
   outside: `.wrapper button` outranks the component's own `.h-9` on
   specificity, so it wins without depending on which utility Tailwind happens
   to emit last. (Descendant, not child: the disc sits inside its Tooltip.)
   LangSwitch has a size of its own for this. */
const TAP_DISC = '[&_button]:h-11 [&_button]:w-11';

export default function MobileMenu({ categories, onNavigate, onSearch, closing }) {
  const { user, logout } = useAuth();
  const { t, locale } = useLocale();
  const { count: savedCount } = useWishlist();
  const location = useLocation();
  const phone = site.phones[0];

  // Mark where the shopper already is, so the menu doubles as a "you are here".
  const params = new URLSearchParams(location.search);
  const onShop = location.pathname === '/shop';
  const isHere = (path) => location.pathname === path;
  const current = (on) => (on ? { 'aria-current': 'page' } : {});

  const cards = houseCards(categories);
  // A stagger for the entrance, continued down the panel.
  const delay = (i) => ({ animationDelay: `${0.04 + i * 0.04}s` });

  const accountRows = user
    ? [
        { to: '/orders', icon: 'bag', label: t('nav.orders') },
        { to: '/profile', icon: 'user', label: t('nav.profile') },
        ...(STAFF_ROLES.includes(user.role) ? [{ to: '/admin', icon: 'grid', label: t('nav.admin') }] : []),
      ]
    : [];

  return (
    <div
      id="site-menu"
      /* Below the header, above the floating contact column — which renders
         later in the document, so without this it would sit on top of the open
         menu. */
      className={`fixed inset-x-0 bottom-0 top-[var(--header-h)] z-menu overflow-y-auto overscroll-contain bg-ink hdr:hidden ${
        closing ? 'panel-out' : 'panel-in'
      }`}
    >
      <nav className="container-bar flex min-h-full flex-col pb-8 pt-5" aria-label={t('nav.menu')}>
        {/* Search leads, drawn as the field it opens: it is the one control a
            shopper reaches for before they know which house they want. */}
        <button
          type="button"
          onClick={onSearch}
          className="group flex min-h-12 w-full items-center gap-3 border border-white/15 px-4 text-left transition-colors duration-300 hover:border-gold/50"
        >
          <Icon name="search" className="h-[1.1rem] w-[1.1rem] text-white/45 transition-colors group-hover:text-gold" />
          <span className="text-sm text-white/45">{t('search.placeholder')}</span>
        </button>

        {/* ── Products ─────────────────────────────────────────────────── */}
        <Link
          to={SHOP_ALL}
          onClick={onNavigate}
          {...current(onShop && params.get('all') === '1' && !params.get('gender'))}
          className="fade-up group mt-6 flex min-h-12 items-center justify-between gap-4"
          style={delay(0)}
        >
          <span className="heading-serif text-2xl text-white transition-colors duration-300 group-hover:text-gold group-aria-[current=page]:text-gold md:text-3xl">
            {t('nav.products')}
          </span>
          <span className="micro inline-flex items-center gap-2 text-gold">
            {t('nav.allPieces')}
            <Icon
              name="arrowRight"
              className="h-3.5 w-3.5 transition-transform duration-500 ease-[var(--ease-luxe)] group-hover:translate-x-1"
            />
          </span>
        </Link>

        {/* The three houses: stacked bands on a phone, a row of cards on a
            tablet — the same photographs as the desktop panel. */}
        <div className="mt-3 grid gap-2 md:grid-cols-3 md:gap-3">
          {cards.map(({ slug, category, count }, i) => {
            const image = homeMedia.bands[slug];
            const here = onShop && params.get('category') === slug;
            return (
              <Link
                key={slug}
                to={`/shop?category=${slug}`}
                onClick={onNavigate}
                {...current(here)}
                style={delay(i + 1)}
                className={`fade-up group relative flex h-[4.5rem] items-center overflow-hidden border transition-colors duration-500 md:h-40 md:items-end ${
                  here ? 'border-gold/60' : 'border-white/10 hover:border-gold/50'
                }`}
              >
                {image && (
                  <img
                    src={resizeUnsplash(image, 700)}
                    alt=""
                    aria-hidden="true"
                    decoding="async"
                    className="absolute inset-y-0 right-0 h-full w-3/4 object-cover opacity-75 transition-[transform,opacity] duration-[1.1s] ease-[var(--ease-luxe)] group-hover:scale-[1.05] group-hover:opacity-90 md:w-full md:opacity-55 md:group-hover:opacity-75"
                  />
                )}
                {/* Text sits on the left of a band and the foot of a card, so
                    the scrim follows it: sideways on a phone, upwards on a tablet. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-ink from-25% via-ink/60 to-transparent md:bg-gradient-to-t md:from-0% md:via-ink/35"
                />
                <span className="relative flex w-full items-center justify-between gap-3 px-5 md:items-end md:pb-4">
                  <span>
                    <span className={`micro block tracking-button ${here ? 'text-gold' : 'text-white'}`}>
                      {categoryLabel(locale, category)}
                    </span>
                    {count != null && (
                      <span className="mt-1 block text-xs text-white/55">{t('nav.pieceCount', { n: count })}</span>
                    )}
                  </span>
                  <Icon
                    name="arrowRight"
                    className="h-4 w-4 shrink-0 text-gold transition-transform duration-500 ease-[var(--ease-luxe)] group-hover:translate-x-1"
                  />
                </span>
              </Link>
            );
          })}
        </div>

        {/* Who it is for, and what is new — one swipeable line rather than a
            wrapped block, so the houses above keep the room. */}
        <div
          className="fade-up -mx-6 mt-3 flex gap-2 overflow-x-auto px-6 [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-40px),transparent)] [scrollbar-width:none] md:mx-0 md:px-0 md:[mask-image:none] [&::-webkit-scrollbar]:hidden"
          style={delay(4)}
        >
          {GENDERS.map((g) => {
            const here = onShop && params.get('gender') === g;
            return (
              <Link
                key={g}
                to={`${SHOP_ALL}&gender=${g}`}
                onClick={onNavigate}
                {...current(here)}
                className={`${CHIP} ${here ? 'border-gold text-gold' : 'border-white/15 text-white/75 hover:border-gold/50 hover:text-gold'}`}
              >
                {t(`gender.${g}`)}
              </Link>
            );
          })}
          <Link
            to={`${SHOP_ALL}&sort=created_at:desc`}
            onClick={onNavigate}
            className={`${CHIP} border-white/15 text-white/75 hover:border-gold/50 hover:text-gold`}
          >
            {t('nav.newIn')}
          </Link>
        </div>

        {/* ── The shopper's own rows, then settings, at the bottom ─────────
            mt-auto pushes them down a tall viewport without stranding them
            off-screen on a short one. */}
        <div className="mt-auto pt-8">
          <div className="border-t border-white/10 pt-5">
            {user ? (
              <div className="mb-2 flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 font-catalog text-sm uppercase text-gold"
                >
                  {(user.name || user.email || '?').trim().charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-white">{user.name}</span>
                  {user.email && <span className="block truncate text-xs text-white/45">{user.email}</span>}
                </span>
              </div>
            ) : (
              <p className={`${SECTION_HEAD} mb-2`}>{t('nav.account')}</p>
            )}

            {/* Saved works signed in or not — a guest's list lives in the browser. */}
            <Link
              to="/saved"
              onClick={onNavigate}
              {...current(isHere('/saved'))}
              className={`${ROW} ${isHere('/saved') ? 'text-gold' : 'text-white/80'}`}
            >
              <Icon name="heart" className={`${ROW_ICON} text-white/45`} />
              <span className="flex-1">{t('nav.saved')}</span>
              {savedCount > 0 && <span className="text-xs tabular-nums text-gold">{savedCount}</span>}
            </Link>
            {accountRows.map((r) => (
              <Link
                key={r.to}
                to={r.to}
                onClick={onNavigate}
                {...current(isHere(r.to))}
                className={`${ROW} ${isHere(r.to) ? 'text-gold' : 'text-white/80'}`}
              >
                <Icon name={r.icon} className={`${ROW_ICON} text-white/45`} />
                {r.label}
              </Link>
            ))}

            {user ? (
              /* Below the header's own breakpoint the account popover is not
                 shown, so this is the only sign-out a phone has. */
              <button
                type="button"
                onClick={() => {
                  onNavigate();
                  logout();
                }}
                className="link-lux tap-area mt-2 text-xs tracking-meta text-white/50 transition-colors hover:text-white"
              >
                {t('nav.signout')}
              </button>
            ) : (
              <Button to="/login" onClick={onNavigate} variant="outline" size="sm" full className="mt-3">
                {t('nav.login')}
              </Button>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-1 border-t border-white/10 pt-4">
            <div className={SETTING_ROW}>
              <span className={SECTION_HEAD}>{t('nav.language')}</span>
              <LangSwitch size="lg" />
            </div>
            <div className={`${SETTING_ROW} ${TAP_DISC}`}>
              <span className={SECTION_HEAD}>{t('nav.theme')}</span>
              <ThemeToggle />
            </div>
          </div>

          {/* The boutique, two ways: a call, or a message. */}
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
            <a href={telHref(phone)} className="flex min-h-12 items-center gap-3 text-sm tracking-meta text-gold">
              <Icon name="phone" className="h-4 w-4" />
              {phone}
            </a>
            <a
              href={site.social.messenger}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center gap-2 text-sm text-white/65 transition-colors hover:text-gold"
            >
              <Icon name="messageCircle" className="h-4 w-4" />
              Messenger
            </a>
          </div>
        </div>
      </nav>
    </div>
  );
}
