import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useLocale } from '../context/LocaleContext';
import { site, telHref } from '../lib/site';
import Icon from './Icon';
import LangSwitch from './LangSwitch';
import ThemeToggle from './ThemeToggle';

/* The presentation site's header, with a shop's controls added to it:
   80px tall, fixed, white text in both themes, sitting on a bg-ink/85
   backdrop-blur-xl layer that fades in once you scroll off the hero. The
   wordmark is left-aligned with "Monkey" in gold; nav items are 11px uppercase
   at 0.28em with the link-lux underline sweep, and the active route is gold —
   no pill, no background, nothing else. To the right, the same utility cluster
   the marketing site carries — boutique phone, language, round theme toggle —
   with search, account and the bag slotted in before them. */

const STAFF_ROLES = ['staff', 'manager', 'admin'];
const CATEGORY_SLUGS = [
  { slug: 'bags', key: 'nav.bags' },
  { slug: 'watches', key: 'nav.watches' },
  { slug: 'apparel', key: 'nav.apparel' },
];

const NAV_ITEM = 'link-lux micro transition-colors duration-300';

function AccountMenu({ onNavigate }) {
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
      <Link to="/login" className={`${NAV_ITEM} hover:text-gold`} onClick={onNavigate}>
        {t('nav.login')}
      </Link>
    );
  }

  const go = () => {
    setOpen(false);
    onNavigate?.();
  };

  const row = 'block px-5 py-2 text-sm text-white/70 transition-colors hover:text-gold';

  return (
    <div className="relative" ref={ref}>
      <button
        className={`${NAV_ITEM} inline-flex items-center gap-1.5 ${open ? 'text-gold' : 'hover:text-gold'}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {t('nav.account')}
        <Icon
          name="chevronDown"
          className={`h-3 w-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        /* Elevation by border + blur, not by shadow — the house rule for any
           layer floating over the page. */
        <div className="drop-in absolute right-0 mt-5 w-48 border border-white/10 bg-ink/95 py-3 backdrop-blur-xl">
          <p className="micro truncate px-5 pb-2 text-gold/80">{user.name}</p>
          <Link to="/profile" className={row} onClick={go}>
            {t('nav.profile')}
          </Link>
          <Link to="/orders" className={row} onClick={go}>
            {t('nav.orders')}
          </Link>
          {STAFF_ROLES.includes(user.role) && (
            <Link to="/admin/orders" className={row} onClick={go}>
              {t('nav.admin')}
            </Link>
          )}
          <button
            onClick={() => {
              go();
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
  const { user } = useAuth();
  const { openCart, openSearch } = useUI();
  const { t } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const count = items.reduce((n, i) => n + i.quantity, 0);

  const overHero = location.pathname === '/';
  const [scrolled, setScrolled] = useState(!overHero);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the full-screen menu is open. Fixing <body> rather
  // than setting overflow:hidden, because iOS Safari ignores the latter — and
  // restoring scrollY on close, which plain overflow toggling loses.
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

  useEffect(() => {
    if (!overHero) {
      setScrolled(true);
      return undefined;
    }
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overHero]);

  // The menu locks <body> at scrollY 0, so `menuOpen` has to be part of this or
  // the glass layer would drop out the moment the menu opens.
  const solid = scrolled || menuOpen;

  const toShop = (slug) => `/shop?category=${slug}`;
  const cats = CATEGORY_SLUGS.map((c) => ({ ...c, label: t(c.key) }));
  const search = new URLSearchParams(location.search);
  const activeCat = search.get('category') || '';
  const onSale = search.get('sale') === '1';
  const onAll = search.get('all') === '1';
  const phone = site.phones[0];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 text-white transition-colors duration-500 ${
        solid ? 'border-b border-white/10' : 'border-b border-transparent'
      }`}
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

      <div className="container-lux flex h-20 items-center justify-between gap-6">
        <Link
          to="/"
          aria-label="Modern Monkey — Home"
          className="heading-serif shrink-0 text-base uppercase tracking-[0.28em] md:text-lg"
        >
          Modern<span className="text-gold"> Monkey</span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main">
          {cats.map((c) => (
            <Link
              key={c.slug}
              to={toShop(c.slug)}
              className={`${NAV_ITEM} ${activeCat === c.slug ? 'text-gold' : 'hover:text-gold'}`}
            >
              {c.label}
            </Link>
          ))}
          <Link to="/shop?all=1" className={`${NAV_ITEM} ${onAll ? 'text-gold' : 'hover:text-gold'}`}>
            {t('nav.all')}
          </Link>
          <Link
            to="/shop?sale=1"
            className={`${NAV_ITEM} ${onSale ? 'text-gold' : 'text-gold/80 hover:text-gold'}`}
          >
            {t('nav.sale')}
          </Link>
        </nav>

        <div className="flex items-center gap-5 lg:gap-6">
          <button onClick={openSearch} className={`${NAV_ITEM} hidden hover:text-gold sm:inline`}>
            {t('nav.search')}
          </button>
          {/* `flex`, not `block`: a block wrapper around an inline link puts the
              link on its own line box and drops its baseline a pixel or two
              below the neighbouring items. */}
          <div className="hidden items-center lg:flex">
            <AccountMenu />
          </div>
          <button onClick={openCart} className={`${NAV_ITEM} shrink-0 hover:text-gold`}>
            {t('nav.bag')}
            {count > 0 && <sup className="ml-1 text-[0.6rem] text-gold">{count}</sup>}
          </button>

          {/* The marketing site's utility cluster: boutique phone, language,
              round theme toggle. The phone waits for xl — at lg the shop's own
              controls already fill the row. */}
          <div className="hidden items-center gap-5 lg:flex">
            <a
              href={telHref(phone)}
              className="hidden items-center gap-2 text-[11px] tracking-[0.2em] text-white/70 transition-colors hover:text-gold xl:inline-flex"
            >
              <Icon name="phone" className="h-3.5 w-3.5" />
              {phone}
            </a>
            <LangSwitch />
            <ThemeToggle />
          </div>

          <button
            type="button"
            className="-mr-2 inline-flex h-11 w-11 touch-manipulation items-center justify-center lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t('nav.close') : t('nav.menu')}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile menu — full-bleed bg-ink panel starting below the 80px header,
          rendered plainly (no enter/exit animation) so it can never be left
          stranded mid-transition. */}
      {menuOpen && (
        <div className="fixed inset-0 top-20 z-40 overflow-y-auto overscroll-contain bg-ink lg:hidden">
          <nav className="container-lux flex flex-col py-8" aria-label="Mobile">
            {[
              ...cats.map((c) => ({ to: toShop(c.slug), label: c.label })),
              { to: '/shop?all=1', label: t('nav.all') },
              { to: '/shop?sale=1', label: t('nav.sale'), gold: true },
            ].map((l, i) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                style={{ animationDelay: `${0.04 + i * 0.05}s` }}
                className={`fade-up heading-serif block border-b border-white/10 py-4 text-2xl transition-colors hover:text-gold md:py-5 md:text-3xl ${
                  l.gold ? 'text-gold' : 'text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setMenuOpen(false);
                openSearch();
              }}
              style={{ animationDelay: '0.29s' }}
              className="fade-up heading-serif block border-b border-white/10 py-4 text-left text-2xl text-white transition-colors hover:text-gold md:py-5 md:text-3xl"
            >
              {t('nav.search')}
            </button>

            <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-8">
              {user ? (
                <>
                  <Link to="/profile" className="micro text-white/65 hover:text-gold">
                    {t('nav.profile')}
                  </Link>
                  <Link to="/orders" className="micro text-white/65 hover:text-gold">
                    {t('nav.orders')}
                  </Link>
                  {STAFF_ROLES.includes(user.role) && (
                    <Link to="/admin/orders" className="micro text-white/65 hover:text-gold">
                      {t('nav.admin')}
                    </Link>
                  )}
                </>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="micro w-fit text-white/65 hover:text-gold"
                >
                  {t('nav.login')}
                </button>
              )}
              <div className="mt-4 flex items-center justify-between">
                <a
                  href={telHref(phone)}
                  className="inline-flex items-center gap-2 text-sm tracking-[0.2em] text-gold"
                >
                  <Icon name="phone" className="h-4 w-4" /> {phone}
                </a>
                <div className="flex items-center gap-6">
                  <LangSwitch />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
