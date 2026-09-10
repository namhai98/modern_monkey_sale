import { useEffect, useState } from 'react';
import client from '../../api/client';
import { useLocale } from '../../context/LocaleContext';

const inputCls =
  'border border-line bg-transparent px-3 py-2 text-sm text-ink placeholder:text-stone ' +
  'focus:outline-none focus:border-champagne transition-colors';
const btnPrimary =
  'bg-ink text-canvas border border-ink px-4 py-2 text-sm transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50';
const fmtMnt = (n) => `${(Math.floor(n / 1000) * 1000).toLocaleString('en-US')}₮`;

export default function AdminSettings() {
  const { t } = useLocale();
  const [rate, setRate] = useState('');
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    client
      .get('/settings')
      .then((res) => {
        setCurrent(res.data);
        setRate(res.data.mnt_rate != null ? String(res.data.mnt_rate) : '');
        setError(null);
      })
      .catch(() => setError(t('admin.settings.loadFailed')))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await client.patch('/settings', { mnt_rate: Number(rate) });
      setCurrent(res.data);
      setMsg(t('admin.settings.saved'));
    } catch (err) {
      setError(err.response?.data?.error || t('admin.settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const preview = Number(rate) > 0 ? fmtMnt(1450.9 * Number(rate)) : null;

  return (
    <div className="max-w-3xl mx-auto pb-8">
      <h1 className="font-display text-2xl text-ink mb-6">{t('admin.settings.title')}</h1>

      {loading ? (
        <p className="text-stone">{t('admin.settings.loading')}</p>
      ) : (
        <div className="max-w-md border border-line bg-ivory p-6">
          <p className="text-sm font-medium text-ink">{t('admin.settings.rateTitle')}</p>
          <p className="text-sm text-stone mt-1 mb-4 leading-relaxed">
            {t('admin.settings.rateBody')}
          </p>

          <form onSubmit={save} className="flex items-center gap-2">
            <span className="text-sm text-stone">$1 =</span>
            <input
              className={`${inputCls} w-32`}
              type="number"
              step="0.01"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              required
            />
            <span className="text-sm text-stone">₮</span>
            <button className={btnPrimary} disabled={saving}>
              {saving ? t('admin.settings.saving') : t('admin.settings.save')}
            </button>
          </form>

          {preview && (
            <p className="text-xs text-stone mt-4">
              {t('admin.settings.preview', { value: preview })}
            </p>
          )}
          {current?.updated_at && (
            <p className="text-xs text-stone/70 mt-1">
              {t('admin.settings.lastUpdated', { date: new Date(current.updated_at).toLocaleString() })}
            </p>
          )}
          {msg && <p className="text-green-400 text-sm mt-3">{msg}</p>}
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      )}
    </div>
  );
}
