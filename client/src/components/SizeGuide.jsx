import SidePanel from './SidePanel';
import { useLocale } from '../context/LocaleContext';
import { site } from '../lib/site';
import { sizeChart } from '../lib/sizeGuide';

const COLS = ['chest', 'waist', 'hips'];

/* The apparel size chart in a side panel: the table, how to measure, and a
   way to ask the boutique when a shopper is between sizes. `highlight` marks
   the size currently selected on the product page. */
export default function SizeGuide({ open, onClose, highlight }) {
  const { t } = useLocale();

  return (
    <SidePanel open={open} title={t('sizeGuide.title')} subtitle={t('sizeGuide.unit')} onClose={onClose}>
      <p className="text-sm leading-relaxed text-muted">{t('sizeGuide.intro')}</p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="micro py-3 pr-4 text-left font-normal text-muted">{t('sizeGuide.size')}</th>
              {COLS.map((c) => (
                <th key={c} className="micro px-4 py-3 text-right font-normal text-muted last:pr-0">
                  {t(`sizeGuide.${c}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizeChart.map((row) => {
              const on = highlight && highlight.toUpperCase() === row.size;
              return (
                <tr key={row.size} className={`border-b border-line ${on ? 'bg-surface' : ''}`}>
                  <td className={`py-3.5 pr-4 ${on ? 'text-gold' : 'text-foreground'}`}>{row.size}</td>
                  {COLS.map((c) => (
                    <td key={c} className="px-4 py-3.5 text-right tabular-nums text-muted last:pr-0">
                      {row[c]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="eyebrow mt-12">{t('sizeGuide.howTitle')}</h3>
      <ol className="mt-5 space-y-4">
        {COLS.map((c, i) => (
          <li key={c} className="flex gap-4 text-sm leading-relaxed">
            <span className="heading-serif text-gold">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-muted">
              <span className="text-foreground">{t(`sizeGuide.${c}`)}</span> — {t(`sizeGuide.how.${c}`)}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-12 border-t border-line pt-6">
        <p className="text-sm leading-relaxed text-muted">{t('sizeGuide.between')}</p>
        <a
          href={site.social.messenger}
          target="_blank"
          rel="noopener noreferrer"
          className="link-lux micro mt-4 inline-block tracking-button text-gold"
        >
          {t('sizeGuide.ask')}
        </a>
      </div>
    </SidePanel>
  );
}
