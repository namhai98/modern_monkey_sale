import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

export default function AdminNav() {
  const { user } = useAuth();
  const { t } = useLocale();
  const isManager = ['manager', 'admin'].includes(user?.role);

  const tabs = [
    { to: '/admin', label: t('admin.tab.dashboard'), show: true, end: true },
    { to: '/admin/orders', label: t('admin.tab.orders'), show: true },
    { to: '/admin/products', label: t('admin.tab.products'), show: isManager },
    { to: '/admin/categories', label: t('admin.tab.categories'), show: isManager },
    { to: '/admin/brands', label: t('admin.tab.brands'), show: isManager },
    { to: '/admin/discounts', label: t('admin.tab.discounts'), show: isManager },
    { to: '/admin/users', label: t('admin.tab.users'), show: isManager },
    { to: '/admin/settings', label: t('admin.tab.settings'), show: isManager },
  ].filter((t) => t.show);

  // On a phone the eight tabs are one row that scrolls sideways (they used to
  // wrap into three rows above every screen); keep the current one in view.
  const stripRef = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => {
    stripRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [pathname]);

  return (
    /* The rule and the spacing below it belong to AdminLayout, so the tab strip
       itself is just the row. On a phone it bleeds to the screen edges and
       fades out at them, which says "more this way". */
    <div
      ref={stripRef}
      className="-mx-6 flex gap-x-1 overflow-x-auto px-6 [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-40px),transparent)] [scrollbar-width:none] md:mx-0 md:flex-wrap md:gap-x-2 md:overflow-visible md:px-0 md:[mask-image:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            // Active tab is gold and nothing else — the same single signal the
            // storefront nav uses for the current route.
            `micro shrink-0 whitespace-nowrap border-b px-3 py-4 transition-colors duration-300 md:-mb-px md:px-4 ${
              isActive
                ? 'border-gold text-gold'
                : 'border-transparent text-muted hover:text-foreground'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
