import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import Select from '../../components/Select';
import Skeleton from '../../components/Skeleton';
import { useLocale } from '../../context/LocaleContext';
import { inputCls, btnPrimary, stateOn, stateOff, thCls, tdCls, trCls } from './ui';

const ROLES = ['customer', 'staff', 'manager', 'admin'];
const NEW_USER_ROLES = ['staff', 'manager', 'admin'];
const LIMIT = 20;

export default function AdminUsers() {
  const { t } = useLocale();
  const { error: toastError } = useToast();
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get('/users', { params: { page, limit: LIMIT } });
      setUsers(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.users.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page]);

  async function createUser(e) {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      await client.post('/users', form);
      setForm({ name: '', email: '', password: '', role: 'staff' });
      await load();
    } catch (err) {
      setFormError(err.response?.data?.error || t('admin.users.createFailed'));
    } finally {
      setCreating(false);
    }
  }

  async function changeRole(u, role) {
    if (!confirm(t('admin.users.confirmRole', { name: u.name, role: t(`admin.role.${role}`) }))) return;
    try {
      await client.patch(`/users/${u.id}/role`, { role });
      await load();
    } catch (err) {
      toastError(err.response?.data?.error || t('admin.users.roleFailed'));
    }
  }

  async function toggleStatus(u) {
    const key = u.is_active ? 'admin.users.confirmDisable' : 'admin.users.confirmEnable';
    if (!confirm(t(key, { name: u.name }))) return;
    try {
      await client.patch(`/users/${u.id}/status`, { is_active: !u.is_active });
      await load();
    } catch (err) {
      toastError(err.response?.data?.error || t('admin.users.statusFailed'));
    }
  }

  return (
    <div className="max-w-4xl mx-auto pt-10 pb-8">
      <h1 className="heading-serif text-2xl text-foreground mb-6">{t('admin.users.title')}</h1>

      {isAdmin && (
        <form
          onSubmit={createUser}
          className="flex flex-wrap gap-2 items-end mb-8 p-4 border border-line bg-surface"
        >
          <input
            className={inputCls}
            placeholder={t('admin.users.namePlaceholder')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className={inputCls}
            type="email"
            placeholder={t('admin.users.emailPlaceholder')}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className={inputCls}
            type="password"
            placeholder={t('admin.users.passwordPlaceholder')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Select
            className="w-32"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {NEW_USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`admin.role.${r}`)}
              </option>
            ))}
          </Select>
          <button className={btnPrimary} disabled={creating}>
            {creating ? t('admin.users.adding') : t('admin.users.add')}
          </button>
          {formError && <p className="w-full text-danger text-sm">{formError}</p>}
        </form>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && users.length === 0 && (
        <EmptyState inline title={t('admin.users.none')} />
      )}

      {!loading && !error && users.length > 0 && (
        <>
        <table className="w-full text-sm">
          <thead>
            <tr className={trCls}>
              <th className={thCls}>{t('admin.users.colName')}</th>
              <th className={thCls}>{t('admin.users.colEmail')}</th>
              <th className={thCls}>{t('admin.users.colRole')}</th>
              <th className={thCls}>{t('admin.users.colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const editable = isAdmin && u.id !== user.id;
              return (
                <tr key={u.id} className={`${trCls} transition-colors hover:bg-surface`}>
                  <td className={`${tdCls} text-foreground`}>{u.name}</td>
                  <td className={`${tdCls} text-muted`}>{u.email}</td>
                  <td className={tdCls}>
                    {editable ? (
                      <Select
                        className="w-28"
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t(`admin.role.${r}`)}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span className="capitalize text-foreground">{t(`admin.role.${u.role}`)}</span>
                    )}
                  </td>
                  <td className={tdCls}>
                    {editable ? (
                      <button
                        onClick={() => toggleStatus(u)}
                        aria-label={u.is_active ? t('admin.users.disable') : t('admin.users.enable')}
                        title={u.is_active ? t('admin.users.disable') : t('admin.users.enable')}
                        className={`inline-flex items-center gap-1.5 transition-opacity duration-300 hover:opacity-70 ${
                          u.is_active ? stateOn : stateOff
                        }`}
                      >
                        <Icon name={u.is_active ? 'check' : 'x'} className="h-3.5 w-3.5" />
                        {u.is_active ? t('admin.users.active') : t('admin.users.disabled')}
                      </button>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 ${u.is_active ? stateOn : stateOff}`}>
                        <Icon name={u.is_active ? 'check' : 'x'} className="h-3.5 w-3.5" />
                        {u.is_active ? t('admin.users.active') : t('admin.users.disabled')}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {total > LIMIT && (
          <div className="flex items-center justify-center gap-4 mt-8 text-sm">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1 border border-line text-foreground transition-colors hover:border-gold disabled:opacity-40 disabled:hover:border-line">{t('admin.orders.prev')}</button>
            <span className="text-muted">{t('admin.orders.pageOf', { page, total: Math.max(1, Math.ceil(total / LIMIT)) })}</span>
            <button onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(total / LIMIT)), p + 1))} disabled={page >= Math.ceil(total / LIMIT)}
              className="px-3 py-1 border border-line text-foreground transition-colors hover:border-gold disabled:opacity-40 disabled:hover:border-line">{t('admin.orders.next')}</button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
