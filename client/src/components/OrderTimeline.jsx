import Icon from './Icon';
import { useLocale } from '../context/LocaleContext';

// The road an order travels. Cancelled and refunded are exits, not steps.
const STEPS = ['pending', 'paid', 'shipped', 'delivered'];
const CLOSED = new Set(['cancelled', 'refunded']);

const fmt = (d) =>
  new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/* Where an order is, at a glance: four steps across (stacked on a phone), the
   reached ones dated, the current one in gold. Built from the order's status
   history, so a step shows when it actually happened. */
export default function OrderTimeline({ status, history = [], createdAt }) {
  const { t } = useLocale();

  // First time each status was reached; "pending" is the order itself.
  const reachedAt = { pending: createdAt };
  for (const h of history) {
    if (!reachedAt[h.to_status]) reachedAt[h.to_status] = h.created_at;
  }

  if (CLOSED.has(status)) {
    return (
      <div className="border border-line bg-surface p-6 md:p-8">
        <p className="eyebrow">{t('timeline.title')}</p>
        <div className="mt-5 flex items-start gap-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-line text-muted">
            <Icon name="x" className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-sm text-foreground">{t(`timeline.closed.${status}`)}</p>
            {reachedAt[status] && <p className="micro mt-1.5 tracking-meta text-muted">{fmt(reachedAt[status])}</p>}
          </div>
        </div>
      </div>
    );
  }

  const current = Math.max(0, STEPS.indexOf(status));

  return (
    <div className="border border-line bg-surface p-6 md:p-8">
      <p className="eyebrow">{t('timeline.title')}</p>
      <ol className="mt-6 grid gap-0 md:grid-cols-4">
        {STEPS.map((s, i) => {
          const done = i < current;
          const now = i === current;
          const reached = done || now;
          return (
            <li key={s} className="relative flex gap-4 pb-6 last:pb-0 md:block md:pb-0 md:pr-4">
              {/* The rail: down the side on a phone, across on wider screens. */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-3.5 top-7 h-[calc(100%-1.75rem)] w-px md:left-7 md:top-3.5 md:h-px md:w-[calc(100%-1.75rem)] ${
                    done ? 'bg-gold' : 'bg-line'
                  }`}
                />
              )}
              <span
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center border ${
                  done ? 'border-gold bg-gold text-ink' : now ? 'border-gold bg-background text-gold' : 'border-line bg-background text-muted'
                }`}
              >
                {done ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2} /> : <span className="text-[11px] tabular-nums">{i + 1}</span>}
              </span>
              <div className="md:mt-4">
                <p className={`text-sm ${now ? 'text-gold' : reached ? 'text-foreground' : 'text-muted'}`}>
                  {t(`status.${s}`)}
                  {now && <span className="sr-only"> — {t('timeline.current')}</span>}
                </p>
                <p className="micro mt-1.5 tracking-meta text-muted">
                  {reached && reachedAt[s] ? fmt(reachedAt[s]) : '—'}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
