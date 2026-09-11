import { LOCALES } from '../lib/i18n';
import { useLocale } from '../context/LocaleContext';

/* Matches the presentation site's LangToggle: plain text options at 11px /
   0.2em, the active one gold and the rest at 50% opacity, separated by a 12px
   hairline rule rather than a slash character. */
export default function LangSwitch({ className = '' }) {
  const { locale, setLocale } = useLocale();
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {LOCALES.map((l, i) => (
        <span key={l.code} className="flex items-center gap-3">
          {i > 0 && <span aria-hidden="true" className="h-3 w-px bg-current opacity-25" />}
          <button
            type="button"
            onClick={() => setLocale(l.code)}
            aria-pressed={locale === l.code}
            className={`micro tracking-[0.2em] transition-colors duration-300 ${
              locale === l.code ? 'text-gold' : 'opacity-50 hover:opacity-100'
            }`}
          >
            {l.label}
          </button>
        </span>
      ))}
    </div>
  );
}
