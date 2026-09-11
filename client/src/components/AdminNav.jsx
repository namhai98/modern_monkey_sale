import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

export default function AdminNav() {
  const { user } = useAuth();
  const { t } = useLocale();
  const isManager = ['manager', 'admin'].includes(user?.role);

  const tabs = [
    { to: '/admin/orders', label: t('admin.tab.orders'), show: true },
    { to: '/admin/products', label: t('admin.tab.products'), show: isManager },
    { to: '/admin/categories', label: t('admin.tab.categories'), show: isManager },
    { to: '/admin/brands', label: t('admin.tab.brands'), show: isManager },
    { to: '/admin/discounts', label: t('admin.tab.discounts'), show: isManager },
    { to: '/admin/users', label: t('admin.tab.users'), show: isManager },
    { to: '/admin/settings', label: t('admin.tab.settings'), show: isManager },
  ].filter((t) => t.show);

  return (
    /* The rule and the spacing below it belong to AdminLayout, so the tab strip
       itself is just the row. */
    <div className="flex flex-wrap gap-x-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            // Active tab is gold and nothing else — the same single signal the
            // storefront nav uses for the current route.
            `micro -mb-px whitespace-nowrap border-b px-4 py-4 transition-colors duration-300 ${
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
