import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Select from '../../components/Select';
import { useLocale } from '../../context/LocaleContext';
import { inputCls, btnPrimary } from './ui';

const ROLES = ['customer', 'staff', 'manager', 'admin'];
const NEW_USER_ROLES = ['staff', 'manager', 'admin'];

export default function AdminUsers() {
  const { t } = useLocale();
  const { error: toastError } = useToast();
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get('/users');
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.users.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

  async function changeRole(id, role) {
    try {
      await client.patch(`/users/${id}/role`, { role });
      await load();
    } catch (err) {
      toastError(err.response?.data?.error || t('admin.users.roleFailed'));
    }
  }

  async function toggleStatus(u) {
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

      {loading && <p className="text-muted">{t('admin.users.loading')}</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left micro text-muted border-b border-line">
              <th className="py-3 font-normal">{t('admin.users.colName')}</th>
              <th className="py-3 font-normal">{t('admin.users.colEmail')}</th>
              <th className="py-3 font-normal">{t('admin.users.colRole')}</th>
              <th className="py-3 font-normal">{t('admin.users.colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const editable = isAdmin && u.id !== user.id;
              return (
                <tr key={u.id} className="border-b border-line/60 transition-colors hover:bg-surface">
                  <td className="py-3 text-foreground">{u.name}</td>
                  <td className="py-3 text-muted">{u.email}</td>
                  <td className="py-3">
                    {editable ? (
                      <Select
                        className="w-28"
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
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
                  <td className="py-3">
                    {editable ? (
                      <button
                        onClick={() => toggleStatus(u)}
                        className={
                          u.is_active
                            ? 'text-gold transition-opacity duration-300 hover:opacity-70'
                            : 'text-danger transition-opacity duration-300 hover:opacity-70'
                        }
                      >
                        {u.is_active ? t('admin.users.active') : t('admin.users.disabled')}
                      </button>
                    ) : (
                      <span className={u.is_active ? 'text-gold' : 'text-danger'}>
                        {u.is_active ? t('admin.users.active') : t('admin.users.disabled')}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
