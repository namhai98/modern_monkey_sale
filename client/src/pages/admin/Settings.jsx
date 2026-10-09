import { useEffect, useState } from 'react';
import client from '../../api/client';
import Skeleton from '../../components/Skeleton';
import { useLocale } from '../../context/LocaleContext';
import { AdminPage } from './kit';
import { inputCls, btnPrimary, errorCls, okCls } from './ui';

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
    <AdminPage title={t('admin.settings.title')}>
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <section className="border border-line bg-surface p-6 md:p-8">
            <h2 className="micro tracking-button text-gold">{t('admin.settings.liveTitle')}</h2>
            <p className="mb-6 mt-2 text-sm leading-relaxed text-muted">{t('admin.settings.liveBody')}</p>

            <p className="heading-serif text-3xl tabular-nums text-foreground">
              {effective > 0 ? t('admin.settings.liveRate', { value: fmtRate(effective) }) : '—'}
            </p>
            <p className={`mt-2 inline-flex items-center gap-2 text-xs ${sourceHealthy ? 'text-muted' : 'text-gold'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sourceHealthy ? 'bg-gold' : 'bg-gold/50'}`} aria-hidden="true" />
              {sourceNote}
            </p>

            {preview && (
              <p className="mt-6 border-t border-line pt-4 text-xs text-muted">
                {t('admin.settings.preview', { value: preview })}
              </p>
            )}
          </section>

          <section className="border border-line bg-surface p-6 md:p-8">
            <h2 className="micro tracking-button text-gold">{t('admin.settings.rateTitle')}</h2>
            <p className="mb-6 mt-2 text-sm leading-relaxed text-muted">{t('admin.settings.rateBody')}</p>

            <form onSubmit={save}>
              <label htmlFor="mnt-rate" className="micro mb-1 block text-muted">
                {t('admin.settings.rateLabel')}
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <span className="shrink-0 whitespace-nowrap text-sm text-muted">$1 =</span>
                <input
                  id="mnt-rate"
                  className={`${inputCls} w-32 tabular-nums`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  required
                />
                <span className="shrink-0 text-sm text-muted">₮</span>
                <button className={`${btnPrimary} ml-auto`} disabled={saving}>
                  {saving ? t('admin.settings.saving') : t('admin.settings.save')}
                </button>
              </div>
            </form>

            {current?.updated_at && (
              <p className="mt-4 text-xs text-muted">
                {t('admin.settings.lastUpdated', { date: fmtDate(current.updated_at) })}
              </p>
            )}
            {msg && <p className={`${okCls} mt-4`} role="status">{msg}</p>}
            {error && <p className={`${errorCls} mt-4`} role="alert">{error}</p>}
          </section>
        </div>
      )}
    </AdminPage>
  );
}
