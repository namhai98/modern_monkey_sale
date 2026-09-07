import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

const STAFF_ROLES = ['staff', 'manager', 'admin'];
const CATEGORIES = [
  { slug: 'bags', label: 'Bags' },
  { slug: 'watches', label: 'Watches' },
  { slug: 'apparel', label: 'Apparel' },
];

function AccountMenu({ onNavigate }) {
  const { user, logout } = useAuth();
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
        Login
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button className="eyebrow link-underline" onClick={() => setOpen((v) => !v)}>
        Account
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="absolute right-0 mt-4 w-44 bg-canvas border border-line py-2 text-sm"
          >
            <p className="px-4 py-1.5 text-stone text-xs truncate">{user.name}</p>
            <Link to="/profile" className="block px-4 py-1.5 hover:bg-ivory" onClick={() => { setOpen(false); onNavigate?.(); }}>
              Profile
            </Link>
            <Link to="/orders" className="block px-4 py-1.5 hover:bg-ivory" onClick={() => { setOpen(false); onNavigate?.(); }}>
              Orders
            </Link>
            {STAFF_ROLES.includes(user.role) && (
              <Link to="/admin/orders" className="block px-4 py-1.5 hover:bg-ivory" onClick={() => { setOpen(false); onNavigate?.(); }}>
                Admin
              </Link>
            )}
            <button
              onClick={() => { setOpen(false); onNavigate?.(); logout(); }}
              className="block w-full text-left px-4 py-1.5 hover:bg-ivory text-stone"
            >
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const { items } = useCart();
  const { user } = useAuth();
  const { openCart, openSearch } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  const count = items.reduce((n, i) => n + i.quantity, 0);

  const overHero = location.pathname === '/';
  const [scrolled, setScrolled] = useState(!overHero);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-500 ${
        light ? 'text-canvas' : 'text-ink bg-canvas border-b border-line'
      }`}
    >
      <nav className="h-16 md:h-20 px-5 md:px-10 flex items-center justify-between">
        {/* left: categories (desktop) / burger (mobile) */}
        <div className="flex-1 flex items-center gap-7">
          <button
            className="md:hidden eyebrow"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
          <div className="hidden md:flex items-center gap-7">
            {CATEGORIES.map((c) => (
              <Link key={c.slug} to={toShop(c.slug)} className="eyebrow link-underline">
                {c.label}
              </Link>
            ))}
            <Link to="/shop" className="eyebrow link-underline">All</Link>
          </div>
        </div>

        {/* center: wordmark */}
        <Link
          to="/"
          className="font-display text-lg md:text-2xl tracking-[0.35em] md:tracking-[0.45em] uppercase whitespace-nowrap"
        >
          Modern&nbsp;Monkey
        </Link>

        {/* right: search / account / bag */}
        <div className="flex-1 flex items-center justify-end gap-6">
          <button onClick={openSearch} className="eyebrow link-underline hidden sm:inline">
            Search
          </button>
          <div className="hidden md:block">
            <AccountMenu />
          </div>
          <button onClick={openCart} className="eyebrow link-underline">
            Bag{count > 0 && <sup className="ml-0.5 text-[0.6rem]">{count}</sup>}
          </button>
        </div>
      </nav>

      {/* mobile full-screen menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 top-16 bg-canvas text-ink px-6 py-10"
          >
            <div className="flex flex-col gap-6">
              {CATEGORIES.map((c) => (
                <Link key={c.slug} to={toShop(c.slug)} className="font-display text-3xl">
                  {c.label}
                </Link>
              ))}
              <Link to="/shop" className="font-display text-3xl">All</Link>
              <button
                onClick={() => { setMenuOpen(false); openSearch(); }}
                className="font-display text-3xl text-left"
              >
                Search
              </button>
              <div className="border-t border-line pt-6 mt-2 flex flex-col gap-3 text-sm">
                {user ? (
                  <>
                    <Link to="/profile">Profile</Link>
                    <Link to="/orders">Orders</Link>
                    {STAFF_ROLES.includes(user.role) && <Link to="/admin/orders">Admin</Link>}
                  </>
                ) : (
                  <button onClick={() => navigate('/login')} className="text-left">Login</button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
