import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminNav() {
  const { user } = useAuth();
  const isManager = ['manager', 'admin'].includes(user?.role);

  const tabs = [
    { to: '/admin/orders', label: 'Orders', show: true },
    { to: '/admin/products', label: 'Products', show: isManager },
    { to: '/admin/categories', label: 'Categories', show: isManager },
    { to: '/admin/discounts', label: 'Discounts', show: isManager },
    { to: '/admin/users', label: 'Users', show: isManager },
  ].filter((t) => t.show);

  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `px-4 py-2 text-sm -mb-px border-b-2 ${
              isActive
                ? 'border-gray-900 text-gray-900 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
