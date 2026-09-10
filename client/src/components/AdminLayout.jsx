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
export default function AdminLayout() {
  const { t } = useLocale();
  return (
    <div className="px-3 pt-8 md:px-4">
      <div className="max-w-6xl mx-auto">
        <AdminNav />
      </div>
      <Suspense fallback={<div className="max-w-6xl mx-auto pb-8 text-sm text-stone">{t('admin.loading')}</div>}>
        <Outlet />
      </Suspense>
    </div>
  );
}
