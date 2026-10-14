import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminNav from './AdminNav';
import ErrorBoundary from './ErrorBoundary';
import { useLocale } from '../context/LocaleContext';

// Shared chrome for every /admin/* screen. AdminNav lives here, outside the
// Suspense boundary, so switching tabs never unmounts it — only the routed
// page content (the Outlet) swaps, with a small loading line in its place
// while a tab's code loads for the first time. Layout gives the whole admin a
// single transition key for the same reason: a per-path key there rebuilt this
// component on every tab switch and replayed the page fade — the blink.
//
// The error boundary is keyed per tab instead: an error on one tab must not
// follow the user to the next, and resetting it here swaps only the content,
// never the nav.
//
// The gold eyebrow anchors the admin in the same house voice as the storefront;
// the spacing stays deliberately tighter than the editorial rhythm, because
// these are working screens.
export default function AdminLayout() {
  const { t } = useLocale();
  const { pathname } = useLocation();
  return (
    <div className="container-lux pb-10 pt-6">
      {/* The eyebrow shares the tab row from a tablet up — the admin's
          screens are meant to fit one window, and a row of its own cost that. */}
      <div className="flex flex-col gap-3 border-b border-line md:flex-row md:items-center md:gap-8">
        <p className="eyebrow shrink-0">{t('admin.eyebrow')}</p>
        <AdminNav />
      </div>
      {/* Suspense outside, the per-tab boundary inside: the Suspense boundary
          must persist across tabs, because navigations run as transitions and
          a transition keeps an already-shown boundary's content on screen
          while the next tab loads. Re-creating it per tab would flash the
          loading line on every switch. */}
      <Suspense
        fallback={<div className="micro pt-10 text-muted">{t('admin.loading')}</div>}
      >
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}
