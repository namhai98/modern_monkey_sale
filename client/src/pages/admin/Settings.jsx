import { useEffect, useState } from 'react';
import client from '../../api/client';
import Skeleton from '../../components/Skeleton';
import { useLocale } from '../../context/LocaleContext';
import { AdminPage } from './kit';
import { errorCls } from './ui';

const fmtMnt = (n) => `${(Math.floor(n / 1000) * 1000).toLocaleString('en-US')}₮`;
const fmtRate = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '');

export default function AdminSettings() {
  const { t } = useLocale();
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    client
      .get('/settings')
      .then((res) => {
        setCurrent(res.data);
        setError(null);
      })
      .catch(() => setError(t('admin.settings.loadFailed')))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

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
        <Skeleton className="h-48 w-full max-w-xl" />
      ) : (
        <div className="max-w-xl">
          <section className="admin-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">{t('admin.settings.liveTitle')}</h2>
            <p className="mb-6 mt-2 text-sm leading-relaxed text-muted">{t('admin.settings.liveBody')}</p>

            <p className="text-3xl font-bold tabular-nums text-foreground">
              {effective > 0 ? t('admin.settings.liveRate', { value: fmtRate(effective) }) : '—'}
            </p>
            <p className={`mt-2 inline-flex items-center gap-2 text-xs ${sourceHealthy ? 'text-muted' : 'text-gold'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sourceHealthy ? 'bg-gold' : 'bg-gold/50'}`} aria-hidden="true" />
              {sourceNote}
            </p>

            {error && <p className={`${errorCls} mt-4`} role="alert">{error}</p>}

            {preview && (
              <p className="mt-6 border-t border-line pt-4 text-xs text-muted">
                {t('admin.settings.preview', { value: preview })}
              </p>
            )}
          </section>
        </div>
      )}
    </AdminPage>
  );
}
