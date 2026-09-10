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
    <div className="flex flex-wrap gap-1 border-b border-line mb-8">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `whitespace-nowrap px-4 py-3 text-sm -mb-px border-b-2 transition-colors ${
              isActive
                ? 'border-champagne text-ink font-medium'
                : 'border-transparent text-stone hover:text-ink'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
