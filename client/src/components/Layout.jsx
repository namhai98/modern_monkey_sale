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
  // default). Keyed on the PATH, not location.key: a filter or sort control
  // writes its state to the query string, which is a new history entry with a
  // new key but the same page. Scrolling to the top there threw a shopper back
  // to the hero every time they touched a filter — the jump was this effect,
  // not the grid. Controls that do want the top (paging) ask for it themselves.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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
      {/* pt clears the fixed header — --header-h in index.css, which is the one
          place its height is written. On desktop that includes the utility tier
          above the row; the tier collapses on scroll, leaving the padding 36px
          richer than the header then needs, but the only moment it is
          load-bearing is when the page is at the top. The home hero runs under
          the header and takes no padding at all.

          The page-in key gives every route the same 700ms fade-up the
          presentation site applies in its template.tsx.

          Keyed on the PATH, not location.key. A filter, a sort or a page number
          writes itself to the query string — a new history entry, a new key,
          but the same page. Keying on that tore the whole route down and built
          it again on every filter click: the listing lost its products, fell
          back to its skeleton, and the replacement faded in from opacity 0.
          That teardown was the blink. Path-keyed, a route change still gets its
          fade-up and a fresh error boundary, while refining a list leaves the
          page — and everything it has already fetched and decoded — in place. */}
      <main
        id="content"
        className={isHome ? '' : 'min-h-[60vh] pt-[var(--header-h)]'}
      >
        <ErrorBoundary key={pathname}>
          <div key={pathname} className="page-in">
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
