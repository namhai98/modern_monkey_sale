import { useCallback, useEffect, useState } from 'react';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import Pager from '../../components/Pager';
import Select from '../../components/Select';
import Skeleton from '../../components/Skeleton';
import { useLocale } from '../../context/LocaleContext';
import {
  StatusToggle, LoadError, AdminPage, Drawer, FormSection, SearchInput, SelectField, SelectFilter, StatusPill, TableWrap,
  TextField, Toolbar, useDebounced,
} from './kit';
import { thCls, tdCls, trCls } from './ui';

const ROLES = ['customer', 'staff', 'manager', 'admin'];
const NEW_USER_ROLES = ['staff', 'manager', 'admin'];
const LIMIT = 20;
const MIN_PASSWORD = 8;
const emptyUser = { name: '', email: '', password: '', role: 'staff' };

// "Add a team member" — a side panel with labelled fields, opened on demand
// instead of a form that always sat above the list.
function NewUserDrawer({ onClose, onCreated }) {
  const { t } = useLocale();
  const [form, setForm] = useState(emptyUser);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await client.post('/users', form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || t('admin.users.createFailed'));
      setSaving(false);
    }
  }

  return (
    <Drawer
      open
      title={t('admin.users.add')}
      subtitle={t('admin.users.addHint')}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xs" type="submit" form="user-form" disabled={saving}>
            {saving ? t('admin.users.adding') : t('admin.users.add')}
          </Button>
          <Button variant="outline-dark" size="xs" type="button" onClick={onClose}>{t('admin.products.cancel')}</Button>
          {error && <p className="w-full text-sm text-danger">{error}</p>}
        </div>
      }
    >
      <form id="user-form" onSubmit={submit}>
        <FormSection title={t('admin.users.secAccount')} cols={1}>
          <TextField label={t('admin.users.colName')} required value={form.name} autoComplete="off"
            onChange={(e) => set('name', e.target.value)} />
          <TextField label={t('admin.users.colEmail')} type="email" required value={form.email} autoComplete="off"
            onChange={(e) => set('email', e.target.value)} />
          <TextField label={t('admin.users.labelPassword')} type="password" required minLength={MIN_PASSWORD}
            autoComplete="new-password" hint={t('login.passwordHint', { n: MIN_PASSWORD })}
            value={form.password} onChange={(e) => set('password', e.target.value)} />
          <SelectField label={t('admin.users.colRole')} hint={t('admin.users.roleHint')} value={form.role}
            onChange={(e) => set('role', e.target.value)}>
            {NEW_USER_ROLES.map((r) => (
              <option key={r} value={r}>{t(`admin.role.${r}`)}</option>
            ))}
          </SelectField>
        </FormSection>
      </form>
    </Drawer>
  );
}

export default function AdminUsers() {
  const { t } = useLocale();
  const { error: toastError, success } = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [adding, setAdding] = useState(false);
  const q = useDebounced(search.trim());

  useEffect(() => { setPage(1); }, [q, role]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/users', {
        params: { page, limit: LIMIT, ...(q ? { search: q } : {}), ...(role ? { role } : {}) },
      });
      setUsers(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.users.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, q, role, t]);

  useEffect(() => { load(); }, [load]);

  async function changeRole(u, next) {
    const ok = await confirm({
      title: t('admin.users.confirmRole', { name: u.name, role: t(`admin.role.${next}`) }),
      body: t('admin.users.roleHint'),
    });
    if (!ok) return;
    try {
      await client.patch(`/users/${u.id}/role`, { role: next });
      await load();
    } catch (err) {
      toastError(err.response?.data?.error || t('admin.users.roleFailed'));
    }
  }

  async function toggleStatus(u) {
    const key = u.is_active ? 'admin.users.confirmDisable' : 'admin.users.confirmEnable';
    const ok = await confirm({
      title: t(key, { name: u.name }),
      body: u.is_active ? t('admin.users.disableBody') : t('admin.users.enableBody'),
      confirmLabel: u.is_active ? t('admin.users.disable') : t('admin.users.enable'),
      tone: u.is_active ? 'danger' : undefined,
    });
    if (!ok) return;
    try {
      await client.patch(`/users/${u.id}/status`, { is_active: !u.is_active });
      await load();
    } catch (err) {
      toastError(err.response?.data?.error || t('admin.users.statusFailed'));
    }
  }

  const filtered = Boolean(search || role);

  return (
    <AdminPage
      title={t('admin.users.title')}
      count={t('admin.users.count', { n: total })}
      actions={
        isAdmin && (
          <Button size="xs" onClick={() => setAdding(true)}>
            <Icon name="plus" className="h-3.5 w-3.5" />
            {t('admin.users.add')}
          </Button>
        )
      }
    >
      <Toolbar active={filtered} onClear={() => { setSearch(''); setRole(''); }}>
        <SearchInput value={search} onChange={setSearch} placeholder={t('admin.users.searchPlaceholder')} />
        <SelectFilter label={t('admin.users.colRole')} value={role} onChange={setRole}>
          <option value="">{t('admin.users.allRoles')}</option>
          {ROLES.map((r) => <option key={r} value={r}>{t(`admin.role.${r}`)}</option>)}
        </SelectFilter>
      </Toolbar>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {error && <LoadError message={error} onRetry={load} />}

      {!loading && !error && users.length === 0 && (
        <EmptyState inline title={t('admin.users.none')} />
      )}

      {!loading && !error && users.length > 0 && (
        <>
          <TableWrap stickyFirst>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className={trCls}>
                  <th className={thCls}>{t('admin.users.colName')}</th>
                  <th className={thCls}>{t('admin.users.colRole')}</th>
                  <th className={thCls}>{t('admin.users.colJoined')}</th>
                  <th className={thCls}>{t('admin.users.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const editable = isAdmin && u.id !== user.id;
                  return (
                    <tr key={u.id} className={`${trCls} transition-colors hover:bg-surface ${u.is_active ? '' : 'opacity-60'}`}>
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-xs uppercase text-muted">
                            {(u.name || u.email || '?').trim().slice(0, 1)}
                          </span>
                          <div className="min-w-0">
                            <div className="text-foreground">
                              {u.name}
                              {u.id === user.id && <span className="micro ml-2 text-badge text-gold">{t('admin.users.you')}</span>}
                            </div>
                            <div className="truncate text-xs text-muted">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className={tdCls}>
                        {editable ? (
                          <Select className="w-40" value={u.role} aria-label={t('admin.users.colRole')}
                            onChange={(e) => changeRole(u, e.target.value)}>
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{t(`admin.role.${r}`)}</option>
                            ))}
                          </Select>
                        ) : (
                          <span className="text-foreground first-letter:uppercase">{t(`admin.role.${u.role}`)}</span>
                        )}
                      </td>
                      <td className={`${tdCls} whitespace-nowrap text-muted`}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className={tdCls}>
                        {editable ? (
                          <StatusToggle
                            on={u.is_active}
                            onClick={() => toggleStatus(u)}
                            action={u.is_active ? t('admin.users.disable') : t('admin.users.enable')}
                          >
                            {u.is_active ? t('admin.users.active') : t('admin.users.disabled')}
                          </StatusToggle>
                        ) : (
                          <StatusPill on={u.is_active}>
                            {u.is_active ? t('admin.users.active') : t('admin.users.disabled')}
                          </StatusPill>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>

          <Pager
            page={page}
            totalPages={Math.max(1, Math.ceil(total / LIMIT))}
            onChange={setPage}
            prevLabel={t('admin.orders.prev')}
            nextLabel={t('admin.orders.next')}
            className="mt-8"
          />
        </>
      )}

      {adding && (
        <NewUserDrawer
          onClose={() => setAdding(false)}
          onCreated={() => { setAdding(false); success(t('admin.users.created')); load(); }}
        />
      )}
    </AdminPage>
  );
}
