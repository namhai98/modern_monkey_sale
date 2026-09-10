import { useEffect, useState } from 'react';
import client from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useLocale } from '../../context/LocaleContext';
import Icon from '../../components/Icon';

const inputCls =
  'border border-line bg-transparent px-3 py-2 text-sm text-ink placeholder:text-stone ' +
  'focus:outline-none focus:border-champagne transition-colors';
const btnPrimary =
  'bg-ink text-canvas border border-ink px-4 py-2 text-sm transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50';

export default function AdminBrands() {
  const { t } = useLocale();
  const { error: toastError } = useToast();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // { id, name }

  function load() {
    setLoading(true);
    client
      .get('/brands')
      .then((res) => { setBrands(res.data); setError(null); })
      .catch((err) => setError(err.response?.data?.error || t('admin.brands.loadFailed')))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await client.post('/brands', { name });
      setName('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('admin.brands.createFailed'));
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit() {
    try {
      await client.patch(`/brands/${editing.id}`, { name: editing.name });
      setEditing(null);
      load();
    } catch (err) {
      toastError(err.response?.data?.error || t('admin.brands.renameFailed'));
    }
  }

  async function remove(b) {
    if (!confirm(t('admin.brands.confirmDelete', { name: b.name }))) return;
    try {
      await client.delete(`/brands/${b.id}`);
      load();
    } catch (err) {
      toastError(err.response?.data?.error || t('admin.brands.deleteFailed'));
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">
      <h1 className="font-display text-2xl text-ink mb-6">{t('admin.brands.title')}</h1>

      <form onSubmit={create} className="flex gap-2 mb-6">
        <input className={inputCls} placeholder={t('admin.brands.newPlaceholder')} value={name}
          onChange={(e) => setName(e.target.value)} required />
        <button className={btnPrimary} disabled={creating}>
          {creating ? t('admin.brands.adding') : t('admin.brands.add')}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      {loading && <p className="text-stone">{t('admin.brands.loading')}</p>}

      {!loading && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left eyebrow text-stone border-b border-line">
              <th className="py-3 font-normal">{t('admin.brands.colName')}</th>
              <th className="py-3 font-normal">{t('admin.brands.colSlug')}</th>
              <th className="py-3 font-normal">{t('admin.brands.colProducts')}</th>
              <th className="py-3 text-right font-normal">{t('admin.action')}</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-b border-line/60 transition-colors hover:bg-ivory">
                <td className="py-3 text-ink">
                  {editing?.id === b.id ? (
                    <input className={inputCls} value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                  ) : (
                    b.name
                  )}
                </td>
                <td className="py-3 text-stone">{b.slug}</td>
                <td className="py-3 text-stone">{b.product_count}</td>
                <td className="py-3 text-right space-x-3">
                  {editing?.id === b.id ? (
                    <>
                      <button onClick={saveEdit} className="inline-flex text-ink transition-colors hover:text-champagne"
                        aria-label={t('admin.brands.save')} title={t('admin.brands.save')}>
                        <Icon name="check" />
                      </button>
                      <button onClick={() => setEditing(null)} className="inline-flex text-stone transition-colors hover:text-ink"
                        aria-label={t('admin.brands.cancel')} title={t('admin.brands.cancel')}>
                        <Icon name="x" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditing({ id: b.id, name: b.name })}
                        className="inline-flex text-stone transition-colors hover:text-champagne"
                        aria-label={t('admin.brands.rename')} title={t('admin.brands.rename')}>
                        <Icon name="edit" />
                      </button>
                      <button onClick={() => remove(b)} className="inline-flex text-red-400 transition-colors hover:text-red-300"
                        aria-label={t('admin.brands.delete')} title={t('admin.brands.delete')}>
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
