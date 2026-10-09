import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import client from '../api/client';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useLocale } from '../context/LocaleContext';
import { useFocusTrap } from '../lib/useFocusTrap';
import Icon from './Icon';
import LangSwitch from './LangSwitch';
import ThemeToggle from './ThemeToggle';
import BrandLockup from './BrandLockup';
import NavMegaPanel from './NavMegaPanel';
import MobileMenu from './MobileMenu';
import Tooltip from './Tooltip';

/* ─────────────────────────────────────────────────────────────────────────────
   The header, composed three times rather than scaled once — but one constant
   height per breakpoint, not two stacked rows: language and theme used to
   live in their own utility tier above the main row on desktop; they're folded
   into the row itself now, so there's nothing left to expand or collapse.

   MOBILE (<768)   64px. Hamburger · brand lockup · search + bag. Everything
                   else lives in the menu, whose rows sit in the thumb zone.
   TABLET (768–1179) 72px. The brand keeps its wordmark, Products gets a real
                   nav link, and the secondary controls collapse into the
                   same menu. Touch, so no hover surfaces: every nav item is a
                   direct link.
   DESKTOP (≥1180) 72px, constant. Nav left of the centred lockup, action
                   cluster right (language flags, theme, then search/
                   account/cart), and Products opens a panel on hover while
                   still going straight to the catalogue on click.

   The header lists no categories. It carries one way into the shop — Products,
   the whole catalogue — and leaves narrowing to the filter rail on the listing
   itself, which is where a shopper can see what they are narrowing.

   The desktop line is content-driven — see --breakpoint-hdr in index.css. The
   action cluster (flags, theme, search, account, bag) only clears the centred
   lockup from ~1100px, so the row switches at 1180, not at a device width.

   Colour is white in both themes: the header sits on an ink glass that fades in
   once you scroll off the hero, exactly as the presentation site's does.
   ──────────────────────────────────────────────────────────────────────────── */

const STAFF_ROLES = ['staff', 'manager', 'admin'];

// The whole catalogue behind one word. The header used to list the categories
// themselves; it now offers Products, which opens the full listing, and leaves
// narrowing to the shop's own filter rail.
const SHOP_ALL = '/shop?all=1';

const NAV_ITEM = 'link-lux micro transition-colors duration-300';
// 44px is the smallest square a thumb finds reliably. The negative margins let
// the hit area bleed into the container gutter so the icons still read as
// optically aligned with the content edge.
const ICON_BTN =
  'inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center transition-colors duration-300 hover:text-gold';

// Categories and brands for the mega panels. Module-level so the two requests
// happen once per session, and lazily so a visitor who never opens a menu never
// pays for them.
let catalogCache = null;
let catalogRequest = null;

function loadCatalog() {
  catalogRequest =
    catalogRequest ||
    Promise.all([client.get('/categories'), client.get('/brands')])
      .then(([cats, brands]) => {
        // Empty categories are left out of the menus, as in the shop's bar.
        catalogCache = {
          categories: (cats.data || []).filter((c) => (c.product_count ?? 1) > 0),
          brands: brands.data || [],
        };
        return catalogCache;
      })
      .catch(() => {
        // A header that cannot reach the API still navigates — the panels just
        // show their static columns. Reset so the next open can retry.
        catalogRequest = null;
        return null;
      });
  return catalogRequest;
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!user) {
    return (
      <Tooltip label={t('nav.login')}>
        <Link to="/login" className={`${ICON_BTN} text-white/80`} aria-label={t('nav.login')}>
          <Icon name="user" className="h-[1.15rem] w-[1.15rem]" />
        </Link>
      </Tooltip>
    );
  }

  const row = 'block px-5 py-2.5 text-sm text-white/70 transition-colors hover:text-gold';

  return (
    <div className="relative" ref={ref}>
      {/* No tooltip while the menu is open — it would sit on the menu. */}
      <Tooltip label={t('nav.account')} disabled={open}>
        <button
          type="button"
          className={`${ICON_BTN} ${open ? 'text-gold' : 'text-white/80'}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={t('nav.account')}
        >
          <Icon name="user" className="h-[1.15rem] w-[1.15rem]" />
        </button>
      </Tooltip>
      {open && (
        /* Elevation by border + blur, not by shadow — the house rule for any
           layer floating over the page. */
        <div className="drop-in absolute right-0 mt-3 w-52 border border-white/10 bg-ink/95 py-3 backdrop-blur-xl">
          <p className="micro truncate px-5 pb-2 text-gold/80">{user.name}</p>
          <Link to="/profile" className={row} onClick={() => setOpen(false)}>
            {t('nav.profile')}
          </Link>
          <Link to="/orders" className={row} onClick={() => setOpen(false)}>
            {t('nav.orders')}
          </Link>
          <Link to="/saved" className={row} onClick={() => setOpen(false)}>
            {t('nav.saved')}
          </Link>
          {STAFF_ROLES.includes(user.role) && (
            <Link to="/admin" className={row} onClick={() => setOpen(false)}>
              {t('nav.admin')}
            </Link>
          )}
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className={`${row} w-full text-left`}
          >
            {t('nav.signout')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { items } = useCart();
  const { openCart, openSearch } = useUI();
  const { t } = useLocale();
  const location = useLocation();
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const { count: savedCount } = useWishlist();

  const overHero = location.pathname === '/';
  const [atTop, setAtTop] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [mega, setMega] = useState(false); // is the Products panel open
  const [catalog, setCatalog] = useState(catalogCache);

  const menuButtonRef = useRef(null);
  const closeTimer = useRef(null);
  const megaTimer = useRef(null);
  // While the menu is open, Tab cycles through the header + menu only. The
  // trap sits on the whole header rather than the menu panel because the
  // close (×) toggle lives in the header row, outside the panel.
  const headerRef = useFocusTrap(menuOpen, { initialFocus: menuButtonRef });

  // Close the menu with its exit animation, then unmount on a timer rather than
  // on animationend — a background tab can swallow the event, and a menu that
  // never unmounts is worse than one that closes a frame early.
  const closeMenu = useCallback(() => {
    setMenuClosing(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
    }, 220);
  }, []);

  const openMenu = useCallback(() => {
    clearTimeout(closeTimer.current);
    setMenuClosing(false);
    setMenuOpen(true);
    loadCatalog().then((c) => c && setCatalog(c));
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Any navigation closes everything, instantly — an exit animation playing
  // over a page that has already changed reads as a glitch.
  useEffect(() => {
    setMenuOpen(false);
    setMenuClosing(false);
    setMega(false);
  }, [location.key]);

  // Lock body scroll while the menu is open. Fixing <body> rather than setting
  // overflow:hidden, because iOS Safari ignores the latter — and restoring
  // scrollY on close, which plain overflow toggling loses.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const scrollY = window.scrollY;
    const lockedPath = window.location.pathname;
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
      if (window.location.pathname === lockedPath) {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      }
    };
  }, [menuOpen]);

  // Two different questions, deliberately not one flag: the glass answers "is
  // there content behind the header", the height answers "has the page moved".
  // While the menu is open <body> is fixed and window.scrollY reads 0, which
  // would expand the header under an open menu — so the listener stands down
  // and the last honest reading holds.
  useEffect(() => {
    if (menuOpen) return undefined;
    const onScroll = () => setAtTop(window.scrollY <= 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [menuOpen]);

  // A mega panel anchored under a header the page is sliding past looks
  // detached; close it the moment the page moves.
  useEffect(() => {
    if (!mega) return undefined;
    const close = () => setMega(false);
    const onKey = (e) => e.key === 'Escape' && setMega(false);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [mega]);

  useEffect(() => () => clearTimeout(megaTimer.current), []);

  // Escape closes the menu and hands focus back to the control that opened it.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      closeMenu();
      menuButtonRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, closeMenu]);

  const openMega = () => {
    clearTimeout(megaTimer.current);
    setMega(true);
    loadCatalog().then((c) => c && setCatalog(c));
  };
  // A short grace period so a diagonal mouse travelling from the trigger into
  // the panel does not pass through dead space and dismiss it.
  const scheduleMegaClose = () => {
    clearTimeout(megaTimer.current);
    megaTimer.current = setTimeout(() => setMega(false), 120);
  };

  // Glass: whenever something is behind the header — any page but the home
  // hero, a scrolled page, or an open menu/panel of our own.
  const solid = !overHero || !atTop || menuOpen || Boolean(mega);

  // Products reads as current on any listing — a shopper who has narrowed to
  // one brand, or to the sale, is still inside Products.
  const onShop = location.pathname.startsWith('/shop');

  // Sale is no longer a header link of its own: it is a filter in the shop
  // (and a row in the Products panel), reached from inside the catalogue.
  const menuLinks = [{ to: SHOP_ALL, label: t('nav.products') }];

  const bagLabel = count > 0 ? `${t('nav.bag')} (${count})` : t('nav.bag');
  const savedLabel = savedCount > 0 ? `${t('nav.saved')} (${savedCount})` : t('nav.saved');

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 z-50 text-white transition-colors duration-500 ${
        solid ? 'border-b border-white/10' : 'border-b border-transparent'
      }`}
      onMouseLeave={scheduleMegaClose}
    >
      {/* The glass sits on its own layer, not on the header: a backdrop-filter
          on the header itself would become the containing block for the fixed
          mobile menu below and break it. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 bg-ink/85 backdrop-blur-xl transition-opacity duration-500 ${
          solid ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        /* The brand sits on the row's true centre — absolutely, not as the
           middle of three flex zones, because the zones flanking it are never
           the same width (a menu button on one side, two or three actions on
           the other). Absolute centring makes the lockup's position independent
           of what surrounds it, which is the whole point of a centred mark: it
           must not drift when a bag count appears or a nav item is translated
           into a longer word.
           The row is the positioning context, not <header> — the menu below is
           fixed and has to keep anchoring to the viewport. */
        className="container-bar relative flex h-[var(--header-h)] items-center justify-between gap-2 md:gap-6"
      >
        <span className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center">
          {/* One lockup, three cuts — never the desktop one shrunk. Each cut
              owns its own display so exactly one is ever laid out, and
              pointer-events return on the link itself so the dead centring
              wrapper never swallows a tap meant for a neighbour. */}
          <BrandLockup
            size="sm"
            className="pointer-events-auto inline-flex md:hidden"
            onClick={menuOpen ? closeMenu : undefined}
          />
          <BrandLockup size="md" className="pointer-events-auto hidden md:inline-flex hdr:hidden" />
          <BrandLockup size="lg" className="pointer-events-auto hidden hdr:inline-flex" />
        </span>

        {/* ── Left: menu toggle, and on tablet the priority categories ────── */}
        <div className="flex min-w-0 items-center gap-1 md:gap-2">
          <Tooltip label={menuOpen ? t('nav.close') : t('nav.menu')} className="-ml-2.5 hdr:hidden">
            <button
              ref={menuButtonRef}
              type="button"
              className={ICON_BTN}
              onClick={() => (menuOpen ? closeMenu() : openMenu())}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              aria-label={menuOpen ? t('nav.close') : t('nav.menu')}
            >
              <Icon name={menuOpen ? 'x' : 'menu'} className="h-5 w-5" />
            </button>
          </Tooltip>

          {/* Tablet: Products and Sale as direct links. No hover surfaces on a
              touch screen. 44px in both directions — a target a finger misses
              is not a target. */}
          {/* One landmark for the header's links: the tablet and desktop sets
              are alternatives (only one is ever displayed), so they share a
              single <nav> rather than two landmarks with the same name. The
              hamburger panel is its own "Цэс" landmark. */}
          <nav aria-label={t('nav.primary')} className="flex items-center">
          <div className="hidden items-center gap-4 md:flex lg:gap-7 hdr:hidden">
            <Link
              to={SHOP_ALL}
              className={`${NAV_ITEM} flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center ${
                onShop ? 'text-gold' : 'hover:text-gold'
              }`}
            >
              {t('nav.products')}
            </Link>
          </div>

          {/* Desktop: Products, which opens the whole catalogue on click and a
              panel of ways into it on hover. Left of the centred mark — the
              classic maison composition. It lives in the LEFT zone, not as a
              flex child of its own: with the lockup lifted out of flow, a third
              child would be spaced by justify-between into the middle of the
              row, straight under the mark. */}
          <div className="ml-2 hidden items-center gap-6 hdr:flex min-[1440px]:gap-9">
            {/* flex items-center: without it this Link renders inline and sits
                a couple of px off the row's centre line. */}
            <div
              className="flex items-center"
              onMouseEnter={() => openMega(true)}
              onFocus={() => openMega(true)}
            >
              <Link
                to={SHOP_ALL}
                aria-expanded={Boolean(mega)}
                aria-controls="nav-mega"
                className={`${NAV_ITEM} ${onShop || mega ? 'text-gold' : 'hover:text-gold'}`}
              >
                {t('nav.products')}
              </Link>
            </div>
          </div>
          </nav>
        </div>

        {/* ── Right: actions, then site utilities ─────────────────────────── */}
        {/* -mr-2.5 mirrors the menu button on the left: the 44px hit areas bleed
            into the gutter so they stay full size at 320px without pushing the
            brand lockup into a horizontal scroll. */}
        <div className="-mr-2.5 flex items-center justify-end gap-0.5 md:gap-1 hdr:mr-0 hdr:gap-0.5">
          {/* Desktop only — below hdr these ride in the hamburger panel (see
              MobileMenu). The compact language pill, then the theme icon as
              one more plain icon in the row: no divider, no ringed disc, so
              the whole right side reads as a single even group. */}
          <div className="hidden items-center gap-0.5 hdr:flex" onMouseEnter={scheduleMegaClose}>
            <LangSwitch size="sm" />
            <ThemeToggle variant="plain" />
          </div>

          <Tooltip label={t('nav.search')}>
            <button
              type="button"
              onClick={openSearch}
              onMouseEnter={scheduleMegaClose}
              className={`${ICON_BTN} text-white/80`}
              aria-label={t('nav.search')}
            >
              <Icon name="search" className="h-[1.15rem] w-[1.15rem]" />
            </button>
          </Tooltip>

          {/* Saved pieces — from a small tablet up; on a phone the row lives in
              the hamburger panel so the header keeps its four controls. */}
          <span className="hidden sm:contents">
          <Tooltip label={savedLabel}>
            <Link
              to="/saved"
              onMouseEnter={scheduleMegaClose}
              className={`${ICON_BTN} relative text-white/80`}
              aria-label={savedLabel}
            >
              <Icon name="heart" className="h-[1.15rem] w-[1.15rem]" />
              {savedCount > 0 && (
                <span className="pop-in absolute right-1 top-1.5 min-w-[1rem] text-center text-badge font-medium tabular-nums text-gold">
                  {savedCount > 9 ? '9+' : savedCount}
                </span>
              )}
            </Link>
          </Tooltip>
          </span>

          {/* Account is a menu of its own; on tablet its rows live in the
              hamburger panel instead, so the header keeps one popover only. */}
          <div className="hidden hdr:block" onMouseEnter={scheduleMegaClose}>
            <AccountMenu />
          </div>

          {/* align="end": the bag is the row's last control, so its label
              hangs left instead of past the screen edge. */}
          <Tooltip label={bagLabel} align="end">
            <button
              type="button"
              onClick={openCart}
              onMouseEnter={scheduleMegaClose}
              className={`${ICON_BTN} relative text-white/80`}
              aria-label={bagLabel}
            >
              <Icon name="bag" className="h-[1.15rem] w-[1.15rem]" />
              {count > 0 && (
                /* A gold numeral on the ink ground, not a filled chip — the house
                   has no coloured status pills. */
                <span className="pop-in absolute right-1 top-1.5 min-w-[1rem] text-center text-badge font-medium tabular-nums text-gold">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>
          </Tooltip>

        </div>
      </div>

      {/* ── Desktop mega panel ───────────────────────────────────────────── */}
      {mega && (
        <div
          id="nav-mega"
          className="mega-in absolute inset-x-0 top-full hidden border-t border-white/10 bg-ink/95 backdrop-blur-xl hdr:block"
          onMouseEnter={() => clearTimeout(megaTimer.current)}
          onMouseLeave={scheduleMegaClose}
        >
          <NavMegaPanel
            categories={catalog?.categories || []}
            brands={catalog?.brands || []}
            onNavigate={() => setMega(false)}
          />
        </div>
      )}

      {/* ── Mobile / tablet menu ─────────────────────────────────────────── */}
      {menuOpen && (
        <MobileMenu
          links={menuLinks}
          closing={menuClosing}
          onNavigate={closeMenu}
          onSearch={() => {
            closeMenu();
            openSearch();
          }}
        />
      )}
    </header>
  );
}
