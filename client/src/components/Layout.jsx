import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import SiteFooter from './SiteFooter';
import CartDrawer from './CartDrawer';
import SearchOverlay from './SearchOverlay';
import FloatingContact from './FloatingContact';
import ErrorBoundary from './ErrorBoundary';

// Admin screens keep their own plain chrome — no marketing footer there.
const HIDE_FOOTER = ['/admin', '/login', '/forgot-password', '/reset-password', '/checkout'];
// The floating contact column is storefront furniture; staff working in the
// admin, and a shopper mid-checkout, should not have it over their controls.
const HIDE_FLOATING = ['/admin', '/checkout'];

export default function Layout({ children }) {
  const location = useLocation();
  const { pathname } = location;
  const isHome = pathname === '/';
  const hideFooter = HIDE_FOOTER.some((p) => pathname.startsWith(p));
  const hideFloating = HIDE_FLOATING.some((p) => pathname.startsWith(p));

  // Start every navigation at the top (React Router 7 keeps scroll position by
  // default). Keyed on location.key so it also fires on ?category= changes.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.key]);

  return (
    <>
      {/* The presentation site opens with a gold-on-ink skip link; a storefront
          with this many nav controls needs one more, not less. */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-gold focus:px-4 focus:py-2 focus:text-ink"
      >
        {/* Deliberately untranslated: it mirrors the presentation site's own
            skip link, which is English in both languages. */}
        Skip to content
      </a>
      <Navbar />
      {/* pt clears the 80px fixed header; the home hero runs under it. The
          page-in key gives every route the same 700ms fade-up the presentation
          site applies in its template.tsx. */}
      <main id="content" className={isHome ? '' : 'min-h-[60vh] pt-20'}>
        <ErrorBoundary key={location.key}>
          <div key={location.key} className="page-in">
            {children}
          </div>
        </ErrorBoundary>
      </main>
      {!hideFooter && <SiteFooter flush={isHome} />}
      {!hideFloating && <FloatingContact />}
      <CartDrawer />
      <SearchOverlay />
    </>
  );
}
