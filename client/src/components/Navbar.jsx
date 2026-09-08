import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useLocale } from '../context/LocaleContext';
import LangSwitch from './LangSwitch';

const STAFF_ROLES = ['staff', 'manager', 'admin'];
const CATEGORY_SLUGS = [
  { slug: 'bags', key: 'nav.bags' },
  { slug: 'watches', key: 'nav.watches' },
  { slug: 'apparel', key: 'nav.apparel' },
];

function AccountMenu({ onNavigate }) {
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!user) {
    return (
      <Link to="/login" className="eyebrow link-underline" onClick={onNavigate}>
        {t('nav.login')}
      </Link>
    );
  }

  const go = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div className="relative" ref={ref}>
      <button className="eyebrow link-underline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {t('nav.account')}
      </button>
      {open && (
        <div className="absolute right-0 mt-4 w-44 bg-canvas border border-line py-2 text-sm animate-[fadeIn_0.2s_ease-out]">
          <p className="px-4 py-1.5 text-stone text-xs truncate">{user.name}</p>
          <Link to="/profile" className="block px-4 py-1.5 hover:bg-ivory" onClick={go}>
            {t('nav.profile')}
          </Link>
          <Link to="/orders" className="block px-4 py-1.5 hover:bg-ivory" onClick={go}>
            {t('nav.orders')}
          </Link>
          {STAFF_ROLES.includes(user.role) && (
            <Link to="/admin/orders" className="block px-4 py-1.5 hover:bg-ivory" onClick={go}>
              {t('nav.admin')}
            </Link>
          )}
          <button
            onClick={() => { go(); logout(); }}
            className="block w-full text-left px-4 py-1.5 hover:bg-ivory text-stone"
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

  // Lock body scroll while the full-screen menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!overHero) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overHero]);

  const light = overHero && !scrolled && !menuOpen;
  const toShop = (slug) => `/shop?category=${slug}`;
  const cats = CATEGORY_SLUGS.map((c) => ({ ...c, label: t(c.key) }));

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-500 ${
        light ? 'text-ink' : 'text-ink bg-canvas border-b border-line'
      }`}
    >
      <nav className="h-16 md:h-20 px-4 sm:px-6 md:px-10 flex items-center justify-between gap-3">
        {/* left: categories (desktop) / burger (mobile) */}
        <div className="flex-1 min-w-0 flex items-center gap-7">
          <button
            className="md:hidden eyebrow shrink-0"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={t('nav.menu')}
          >
            {menuOpen ? t('nav.close') : t('nav.menu')}
          </button>
          <div className="hidden md:flex items-center gap-7">
            {cats.map((c) => (
              <Link key={c.slug} to={toShop(c.slug)} className="eyebrow link-underline">
                {c.label}
              </Link>
            ))}
            <Link to="/shop" className="eyebrow link-underline">{t('nav.all')}</Link>
            <Link to="/shop?sale=1" className="eyebrow link-underline text-champagne">{t('nav.sale')}</Link>
          </div>
        </div>

        {/* center: wordmark */}
        <Link
          to="/"
          className="font-display text-sm sm:text-lg md:text-2xl tracking-[0.15em] sm:tracking-[0.3em] md:tracking-[0.45em] uppercase whitespace-nowrap shrink-0"
        >
          Modern&nbsp;Monkey
        </Link>

        {/* right: lang / search / account / bag */}
        <div className="flex-1 min-w-0 flex items-center justify-end gap-4 sm:gap-6">
          <LangSwitch className="hidden md:flex" />
          <button onClick={openSearch} className="eyebrow link-underline hidden sm:inline">
            {t('nav.search')}
          </button>
          <div className="hidden md:block">
            <AccountMenu />
          </div>
          <button onClick={openCart} className="eyebrow link-underline shrink-0">
            {t('nav.bag')}
            {count > 0 && <sup className="ml-0.5 text-[0.6rem] text-champagne">{count}</sup>}
          </button>
        </div>
      </nav>

      {/* mobile full-screen menu — plain render (no motion) so it can never
          get stuck mid-animation */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-canvas text-ink px-6 py-10 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
          <div className="flex flex-col gap-6">
            {cats.map((c) => (
              <Link key={c.slug} to={toShop(c.slug)} className="font-display text-3xl">
                {c.label}
              </Link>
            ))}
            <Link to="/shop" className="font-display text-3xl">{t('nav.all')}</Link>
            <Link to="/shop?sale=1" className="font-display text-3xl text-champagne">{t('nav.sale')}</Link>
            <button
              onClick={() => { setMenuOpen(false); openSearch(); }}
              className="font-display text-3xl text-left"
            >
              {t('nav.search')}
            </button>
            <div className="border-t border-line pt-6 mt-2 flex flex-col gap-3 text-sm">
              {user ? (
                <>
                  <Link to="/profile">{t('nav.profile')}</Link>
                  <Link to="/orders">{t('nav.orders')}</Link>
                  {STAFF_ROLES.includes(user.role) && <Link to="/admin/orders">{t('nav.admin')}</Link>}
                </>
              ) : (
                <button onClick={() => navigate('/login')} className="text-left">{t('nav.login')}</button>
              )}
              <LangSwitch className="pt-2" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
