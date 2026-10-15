import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { SkinProvider } from '../context/SkinContext';
import { useTheme } from '../context/ThemeContext';
import { LOCALES } from '../lib/i18n';
import ErrorBoundary from './ErrorBoundary';
import Icon from './Icon';

/* The admin's own shell, after the Flowbite admin dashboard: a fixed top bar,
   a fixed sidebar on a computer (an off-canvas drawer below lg), and a grey
   page the screens sit on as white cards. It replaces the storefront's header
   and footer entirely — Layout hands /admin/* straight through.

   `.admin-ui` re-points the theme tokens to Flowbite's greys (index.css) and
   SkinProvider switches Button, Field and Select to their admin skin, so the
   screens inside keep their markup and change their look.

   The shell stays mounted across every /admin/* navigation; only the Outlet
   swaps, inside a per-screen error boundary, so moving between screens never
   rebuilds the chrome. */

const STAFF_ROLES = ['staff', 'manager', 'admin'];

function useNavGroups() {
  const { user } = useAuth();
  const { t } = useLocale();
  const manager = ['manager', 'admin'].includes(user?.role);
  return [
    {
      title: t('admin.group.overview'),
      items: [
        { to: '/admin', end: true, icon: 'dashboard', label: t('admin.tab.dashboard') },
        { to: '/admin/orders', icon: 'bag', label: t('admin.tab.orders'), badge: 'pending' },
      ],
    },
    manager && {
      title: t('admin.group.catalog'),
      items: [
        { to: '/admin/products', icon: 'package', label: t('admin.tab.products') },
        { to: '/admin/categories', icon: 'tags', label: t('admin.tab.categories') },
        { to: '/admin/brands', icon: 'gem', label: t('admin.tab.brands') },
        { to: '/admin/discounts', icon: 'percent', label: t('admin.tab.discounts') },
      ],
    },
    manager && {
      title: t('admin.group.system'),
      items: [
        { to: '/admin/users', icon: 'users', label: t('admin.tab.users') },
        { to: '/admin/settings', icon: 'settings', label: t('admin.tab.settings') },
      ],
    },
  ].filter(Boolean);
}

// Orders waiting on someone: the count on the sidebar's Orders row, refreshed
// on every admin navigation so it follows the work being done.
function usePendingCount(pathname) {
  const [n, setN] = useState(null);
  useEffect(() => {
    let live = true;
    client
      .get('/orders', { params: { status: 'pending', limit: 1 } })
      .then((res) => live && setN(res.data.total))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pathname]);
  return n;
}

function Sidebar({ open, onClose, pending }) {
  const { t } = useLocale();
  const groups = useNavGroups();
  return (
    <>
      {/* Below lg the sidebar is a drawer over a dimmed page. */}
      {open && (
        <button
          type="button"
          aria-label={t('admin.shell.closeMenu')}
          onClick={onClose}
          className="fixed inset-0 top-16 z-drawer bg-ink/50 lg:hidden"
        />
      )}
      <aside
        id="admin-sidebar"
        aria-label={t('admin.shell.menu')}
        className={`fixed bottom-0 left-0 top-16 z-drawer flex w-64 flex-col border-r border-line bg-surface transition-transform duration-300 ease-[var(--ease-luxe)] lg:z-sticky lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex-1 space-y-1 divide-y divide-line overflow-y-auto px-3 py-4">
          {groups.map((g, gi) => (
            <div key={g.title} className={gi === 0 ? 'pb-3' : 'py-3'}>
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">{g.title}</p>
              <ul className="space-y-1">
                {g.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
                          isActive ? 'bg-admin-hover text-foreground' : 'text-foreground/85 hover:bg-admin-hover hover:text-foreground'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            name={item.icon}
                            className={`h-5 w-5 shrink-0 transition-colors ${isActive ? 'text-gold' : 'text-muted group-hover:text-foreground'}`}
                          />
                          <span className="flex-1">{item.label}</span>
                          {item.badge === 'pending' && pending > 0 && (
                            <span
                              className="inline-flex min-w-6 items-center justify-center rounded-full bg-gold-fill/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-gold"
                              aria-label={t('admin.shell.pending', { n: pending })}
                            >
                              {pending}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-admin-hover hover:text-foreground"
          >
            <Icon name="store" className="h-5 w-5 shrink-0" />
            {t('admin.shell.store')}
          </Link>
        </div>
      </aside>
    </>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  if (!user) return null;
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t('admin.shell.account')}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-fill text-sm font-semibold text-ink ring-offset-2 ring-offset-surface transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        {initial}
      </button>
      {open && (
        <div className="drop-in absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
          <ul className="py-1 text-sm">
            <li>
              <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-foreground hover:bg-admin-hover">
                <Icon name="user" className="h-4 w-4 text-muted" />
                {t('nav.profile')}
              </Link>
            </li>
            <li>
              <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-foreground hover:bg-admin-hover">
                <Icon name="store" className="h-4 w-4 text-muted" />
                {t('admin.shell.store')}
              </Link>
            </li>
          </ul>
          <div className="border-t border-line py-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-danger hover:bg-admin-hover"
            >
              <Icon name="logOut" className="h-4 w-4" />
              {t('nav.signout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Topbar({ menuOpen, onMenu }) {
  const { t, locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const next = LOCALES.find((l) => l.code !== locale) || LOCALES[0];
  const iconBtn =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-admin-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold';
  return (
    <header className="fixed inset-x-0 top-0 z-header h-16 border-b border-line bg-surface">
      <div className="flex h-full items-center justify-between gap-3 px-3 lg:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMenu}
            aria-expanded={menuOpen}
            aria-controls="admin-sidebar"
            aria-label={menuOpen ? t('admin.shell.closeMenu') : t('admin.shell.menu')}
            className={`${iconBtn} lg:hidden`}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} className="h-5 w-5" />
          </button>
          <Link to="/admin" className="flex items-center gap-2.5 rounded-lg px-1 py-1">
            <img src="/home/logo-gold.webp" alt="" className="h-8 w-8 rounded-lg object-cover" />
            <span className="hidden text-lg font-semibold tracking-tight text-foreground sm:inline">Modern Monkey</span>
            <span className="rounded-md bg-admin-hover px-2 py-0.5 text-xs font-medium text-muted">{t('admin.shell.title')}</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLocale(next.code)}
            className={`${iconBtn} w-auto gap-1.5 px-2.5 text-xs font-semibold`}
            aria-label={t('lang.switchTo', { name: next.name })}
          >
            <Icon name="languages" className="h-4 w-4" />
            {LOCALES.find((l) => l.code === locale)?.label}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className={iconBtn}
            aria-label={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-[1.1rem] w-[1.1rem]" />
          </button>
          <Link to="/" className="hidden h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-admin-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:inline-flex">
            <Icon name="externalLink" className="h-4 w-4" />
            {t('admin.shell.store')}
          </Link>
          <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export default function AdminLayout() {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const pending = usePendingCount(pathname);

  // Any navigation closes the phone drawer; Escape does too.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <SkinProvider value="admin">
      <div className="admin-ui min-h-svh bg-background text-foreground">
        <a
          href="#admin-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-skip focus:rounded-lg focus:bg-gold-fill focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <Topbar menuOpen={menuOpen} onMenu={() => setMenuOpen((v) => !v)} />
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} pending={pending} />
        <div className="pt-16 lg:pl-64">
          <main id="admin-content" className="min-h-[calc(100svh-4rem)] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
            <Suspense fallback={<div className="pt-4 text-sm text-muted">{t('admin.loading')}</div>}>
              <ErrorBoundary key={pathname}>
                <Outlet />
              </ErrorBoundary>
            </Suspense>
          </main>
        </div>
      </div>
    </SkinProvider>
  );
}
