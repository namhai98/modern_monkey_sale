import { useEffect, useState } from 'react';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useLocale } from '../../context/LocaleContext';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import Skeleton from '../../components/Skeleton';
import { inputCls, btnPrimary, thCls, thNumCls, tdCls, tdNumCls, trCls } from './ui';


export default function AdminCategories() {
  const { t } = useLocale();
  const { error: toastError } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // { id, name }

  function load() {
    setLoading(true);
    client
      .get('/categories')
      .then((res) => { setCategories(res.data); setError(null); })
      .catch((err) => setError(err.response?.data?.error || t('admin.categories.loadFailed')))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await client.post('/categories', { name });
      setName('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('admin.categories.createFailed'));
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit() {
    try {
      await client.patch(`/categories/${editing.id}`, { name: editing.name });
      setEditing(null);
      load();
    } catch (err) {
      toastError(err.response?.data?.error || t('admin.categories.renameFailed'));
    }
  }

  async function remove(c) {
    if (!confirm(t('admin.categories.confirmDelete', { name: c.name }))) return;
    try {
      await client.delete(`/categories/${c.id}`);
      load();
    } catch (err) {
      toastError(err.response?.data?.error || t('admin.categories.deleteFailed'));
    }
  }

  return (
    <div className="max-w-3xl mx-auto pt-10 pb-8">
      <h1 className="heading-serif text-2xl text-foreground mb-6">{t('admin.categories.title')}</h1>

      <form onSubmit={create} className="flex gap-2 mb-6">
        <input className={inputCls} placeholder={t('admin.categories.newPlaceholder')} value={name}
          onChange={(e) => setName(e.target.value)} required />
        <button className={btnPrimary} disabled={creating}>
          {creating ? t('admin.categories.adding') : t('admin.categories.add')}
        </button>
      </form>

      {error && <p className="text-danger text-sm mb-3">{error}</p>}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {!loading && categories.length === 0 && (
        <EmptyState inline title={t('admin.categories.none')} />
      )}

      {!loading && categories.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className={trCls}>
              <th className={thCls}>{t('admin.categories.colName')}</th>
              <th className={thCls}>{t('admin.categories.colSlug')}</th>
              <th className={thCls}>{t('admin.categories.colProducts')}</th>
              <th className={thNumCls}>{t('admin.action')}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className={`${trCls} transition-colors hover:bg-surface`}>
                <td className={`${tdCls} text-foreground`}>
                  {editing?.id === c.id ? (
                    <input className={inputCls} value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                  ) : (
                    c.name
                  )}
                </td>
                <td className={`${tdCls} text-muted`}>{c.slug}</td>
                <td className={`${tdCls} text-muted`}>{c.product_count}</td>
                <td className={`${tdNumCls} space-x-3`}>
                  {editing?.id === c.id ? (
                    <>
                      <button onClick={saveEdit} className="inline-flex text-foreground transition-colors hover:text-gold"
                        aria-label={t('admin.categories.save')} title={t('admin.categories.save')}>
                        <Icon name="check" />
                      </button>
                      <button onClick={() => setEditing(null)} className="inline-flex text-muted transition-colors hover:text-foreground"
                        aria-label={t('admin.categories.cancel')} title={t('admin.categories.cancel')}>
                        <Icon name="x" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditing({ id: c.id, name: c.name })}
                        className="inline-flex text-muted transition-colors hover:text-gold"
                        aria-label={t('admin.categories.rename')} title={t('admin.categories.rename')}>
                        <Icon name="edit" />
                      </button>
                      <button onClick={() => remove(c)} className="inline-flex text-danger transition-opacity duration-300 hover:opacity-70"
                        aria-label={t('admin.categories.delete')} title={t('admin.categories.delete')}>
                        <Icon name="trash" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
