import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import AdminNav from './AdminNav';
import { useLocale } from '../context/LocaleContext';

// Shared chrome for every /admin/* screen. AdminNav lives here, outside the
// Suspense boundary, so switching tabs never unmounts it — only the routed
// page content (the Outlet) swaps, with a small loading line in its place
// while the next chunk loads. Before this, each admin page rendered its own
// AdminNav and was itself the lazy-loaded, Suspense-wrapped unit, so every
// tab switch blanked the whole screen down to a bare "Loading…" flash.
//
// The gold eyebrow anchors the admin in the same house voice as the storefront;
// below it the spacing stays deliberately tighter than the editorial rhythm,
// because these are working screens.
export default function AdminLayout() {
  const { t } = useLocale();
  return (
    <div className="container-lux pb-16 pt-10">
      <p className="eyebrow">{t('admin.eyebrow')}</p>
      <div className="mt-6 border-b border-line">
        <AdminNav />
      </div>
      <Suspense
        fallback={<div className="micro pt-10 text-muted">{t('admin.loading')}</div>}
      >
        <Outlet />
      </Suspense>
    </div>
  );
}
