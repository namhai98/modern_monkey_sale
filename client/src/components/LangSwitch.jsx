import { LOCALES } from '../lib/i18n';
import { useLocale } from '../context/LocaleContext';

export default function LangSwitch({ className = '' }) {
  const { locale, setLocale } = useLocale();
  return (
    <div className={`flex items-center gap-1.5 eyebrow ${className}`}>
      {LOCALES.map((l, i) => (
        <span key={l.code} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-current/30">/</span>}
          <button
            onClick={() => setLocale(l.code)}
            aria-pressed={locale === l.code}
            className={locale === l.code ? 'text-champagne' : 'opacity-40 hover:opacity-70'}
          >
            {l.label}
          </button>
        </span>
      ))}
    </div>
  );
}
