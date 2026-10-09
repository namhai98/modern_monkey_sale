import { useCallback, useEffect, useState } from 'react';
import client from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useLocale } from '../../context/LocaleContext';
import { categoryLabel } from '../../lib/i18n';
import { AdminPage, RowAction, SearchInput, TableWrap, TextField, Toolbar } from './kit';
import { btnPrimary, inputCls, thCls, thNumCls, tdCls, tdNumCls, trCls } from './ui';

/* Categories and brands are the same screen — a named list with a slug and a
   product count, add / rename / delete — so one component serves both.
   `endpoint` is the API collection, `ns` the i18n namespace ("categories" or
   "brands"), `localize` whether names have shop-facing translations. */
export default function TaxonomyPage({ endpoint, ns, localize = false }) {
  const { t, locale } = useLocale();
  const { error: toastError } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // { id, name }
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    client
      .get(`/${endpoint}`)
      .then((res) => { setRows(res.data); setError(null); })
      .catch((err) => setError(err.response?.data?.error || t(`admin.${ns}.loadFailed`)))
      .finally(() => setLoading(false));
  }, [endpoint, ns, t]);

  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await client.post(`/${endpoint}`, { name: name.trim() });
      setName('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || t(`admin.${ns}.createFailed`));
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit(e) {
    e?.preventDefault();
    try {
      await client.patch(`/${endpoint}/${editing.id}`, { name: editing.name.trim() });
      setEditing(null);
      load();
    } catch (err) {
      toastError(err.response?.data?.error || t(`admin.${ns}.renameFailed`));
    }
  }

  async function remove(row) {
    if (!confirm(t(`admin.${ns}.confirmDelete`, { name: row.name }))) return;
    try {
      await client.delete(`/${endpoint}/${row.id}`);
      load();
    } catch (err) {
      toastError(err.response?.data?.error || t(`admin.${ns}.deleteFailed`));
    }
  }

  const term = search.trim().toLowerCase();
  const shown = term
    ? rows.filter((r) => [r.name, r.slug, localize ? categoryLabel(locale, r) : ''].some((s) => s?.toLowerCase().includes(term)))
    : rows;

  return (
    <AdminPage title={t(`admin.${ns}.title`)} count={t(`admin.${ns}.count`, { n: rows.length })}>
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div>
          {rows.length > 6 && (
            <Toolbar active={Boolean(search)} onClear={() => setSearch('')}>
              <SearchInput value={search} onChange={setSearch} />
            </Toolbar>
          )}

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {!loading && rows.length === 0 && <EmptyState inline title={t(`admin.${ns}.none`)} />}

          {!loading && shown.length > 0 && (
            <TableWrap>
              <table className="w-full text-sm">
                <thead>
                  <tr className={trCls}>
                    <th className={thCls}>{t(`admin.${ns}.colName`)}</th>
                    <th className={thCls}>{t(`admin.${ns}.colSlug`)}</th>
                    <th className={thNumCls}>{t(`admin.${ns}.colProducts`)}</th>
                    <th className={thNumCls}><span className="sr-only">{t('admin.action')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} className={`${trCls} transition-colors hover:bg-surface`}>
                      <td className={tdCls}>
                        {editing?.id === r.id ? (
                          <form onSubmit={saveEdit}>
                            {/* Autofocused: the rename starts where the eye already is. */}
                            <input className={inputCls} value={editing.name} autoFocus aria-label={t(`admin.${ns}.colName`)}
                              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                              onKeyDown={(e) => e.key === 'Escape' && setEditing(null)} />
                          </form>
                        ) : (
                          <>
                            <div className="font-medium text-foreground">{r.name}</div>
                            {localize && categoryLabel(locale, r) !== r.name && (
                              <div className="text-xs text-muted">{categoryLabel(locale, r)}</div>
                            )}
                          </>
                        )}
                      </td>
                      <td className={`${tdCls} font-mono text-xs text-muted`}>{r.slug}</td>
                      <td className={`${tdNumCls} text-muted`}>{r.product_count}</td>
                      <td className={`${tdNumCls} whitespace-nowrap`}>
                        {editing?.id === r.id ? (
                          <>
                            <RowAction icon="check" label={t(`admin.${ns}.save`)} onClick={saveEdit} />
                            <RowAction icon="x" label={t(`admin.${ns}.cancel`)} onClick={() => setEditing(null)} />
                          </>
                        ) : (
                          <>
                            <RowAction icon="edit" label={t(`admin.${ns}.rename`)} onClick={() => setEditing({ id: r.id, name: r.name })} />
                            {/* A list still in use can't be deleted — say why
                                instead of failing after the confirm. */}
                            <RowAction
                              icon="trash"
                              danger
                              disabled={r.product_count > 0}
                              label={r.product_count > 0 ? t('admin.ui.inUse', { n: r.product_count }) : t(`admin.${ns}.delete`)}
                              onClick={() => remove(r)}
                            />
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </div>

        {/* Add — a small panel beside the list rather than a bare field above it. */}
        <form onSubmit={create} className="border border-line bg-surface p-6 lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
          <p className="micro tracking-button text-gold">{t(`admin.${ns}.addTitle`)}</p>
          <TextField className="mt-5" label={t(`admin.${ns}.colName`)} required value={name}
            placeholder={t(`admin.${ns}.newPlaceholder`)} onChange={(e) => setName(e.target.value)} />
          <p className="mt-2 text-xs leading-relaxed text-muted">{t('admin.ui.slugHint')}</p>
          <button className={`${btnPrimary} mt-6 w-full gap-2`} disabled={creating || !name.trim()}>
            <Icon name="plus" className="h-3.5 w-3.5" />
            {creating ? t(`admin.${ns}.adding`) : t(`admin.${ns}.add`)}
          </button>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </form>
      </div>
    </AdminPage>
  );
}
