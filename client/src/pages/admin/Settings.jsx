import { useEffect, useState } from 'react';
import client from '../../api/client';
import { useLocale } from '../../context/LocaleContext';
import { inputCls, btnPrimary } from './ui';

const fmtMnt = (n) => `${(Math.floor(n / 1000) * 1000).toLocaleString('en-US')}₮`;
const fmtRate = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '');

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
        // The input edits the fallback, never the live reading.
        setRate(res.data.mnt_rate_manual != null ? String(res.data.mnt_rate_manual) : '');
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

  const source = current?.mnt_rate_source;
  const effective = Number(current?.mnt_rate);
  // What shoppers actually see right now — the live rate when there is one.
  const preview = effective > 0 ? fmtMnt(1450.9 * effective) : null;

  // A live-but-stale reading and a fallback in use are both worth flagging; a
  // healthy live feed is not.
  const sourceNote =
    source === 'live'
      ? t(current.mnt_rate_stale ? 'admin.settings.sourceStale' : 'admin.settings.sourceLive', {
          date: fmtDate(current.mnt_rate_updated_at),
        })
      : source === 'manual'
        ? t('admin.settings.sourceManual')
        : t('admin.settings.sourceUnavailable');
  const sourceHealthy = source === 'live' && !current?.mnt_rate_stale;

  return (
    <div className="max-w-3xl mx-auto pt-10 pb-8">
      <h1 className="heading-serif text-2xl text-foreground mb-6">{t('admin.settings.title')}</h1>

      {loading ? (
        <p className="text-muted">{t('admin.settings.loading')}</p>
      ) : (
        <div className="max-w-md space-y-6">
          <div className="border border-line bg-surface p-6">
            <p className="micro text-muted">{t('admin.settings.liveTitle')}</p>
            <p className="text-sm text-muted mt-1 mb-4 leading-relaxed">
              {t('admin.settings.liveBody')}
            </p>

            <p className="heading-serif text-2xl text-foreground tabular-nums">
              {effective > 0 ? t('admin.settings.liveRate', { value: fmtRate(effective) }) : '—'}
            </p>
            <p className={`text-xs mt-2 ${sourceHealthy ? 'text-muted/70' : 'text-gold'}`}>
              {sourceNote}
            </p>

            {preview && (
              <p className="text-xs text-muted mt-4">
                {t('admin.settings.preview', { value: preview })}
              </p>
            )}
          </div>

          <div className="border border-line bg-surface p-6">
            <p className="micro text-muted">{t('admin.settings.rateTitle')}</p>
            <p className="text-sm text-muted mt-1 mb-4 leading-relaxed">
              {t('admin.settings.rateBody')}
            </p>

            <form onSubmit={save} className="flex items-center gap-2">
              <span className="shrink-0 whitespace-nowrap text-sm text-muted">$1 =</span>
              <input
                className={`${inputCls} w-28`}
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
              <span className="shrink-0 text-sm text-muted">₮</span>
              <button className={btnPrimary} disabled={saving}>
                {saving ? t('admin.settings.saving') : t('admin.settings.save')}
              </button>
            </form>

            {current?.updated_at && (
              <p className="text-xs text-muted/70 mt-3">
                {t('admin.settings.lastUpdated', { date: fmtDate(current.updated_at) })}
              </p>
            )}
            {msg && <p className="text-gold text-sm mt-3">{msg}</p>}
            {error && <p className="text-danger text-sm mt-3">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
