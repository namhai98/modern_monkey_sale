import { LOCALES } from '../lib/i18n';
import { useLocale } from '../context/LocaleContext';
import Tooltip from './Tooltip';

/* Flags drawn inline rather than as emoji: Windows has no flag emoji and
   renders 🇲🇳 as the bare letters "MN", which is exactly the text this replaced.
   Both are drawn on a 2:1 canvas (Mongolia's own proportion; the US flag's
   19:10 is close enough that `slice` crops nothing visible), so the two sit in
   identical boxes. */

// Red–blue–red with a simplified Soyombo on the hoist stripe — at 13px tall the
// full emblem's detail is sub-pixel, so this keeps its silhouette: flame, sun,
// moon, the two triangles and bars, the yin-yang, and the side pillars.
function FlagMN() {
  const red = '#C4272F';
  const gold = '#F9CF02';
  return (
    <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="block h-full w-full">
      <rect width="400" height="600" fill={red} />
      <rect x="400" width="400" height="600" fill="#015197" />
      <rect x="800" width="400" height="600" fill={red} />
      <g fill={gold}>
        <path d="M200 40 C218 72 228 94 200 116 C172 94 182 72 200 40 Z" />
        <circle cx="200" cy="152" r="32" />
        <path d="M155 200 A45 45 0 0 0 245 200 A45 36 0 0 1 155 200 Z" />
        <polygon points="150,258 250,258 200,288" />
        <rect x="150" y="298" width="100" height="18" />
        <circle cx="200" cy="370" r="45" />
        <rect x="150" y="425" width="100" height="18" />
        <polygon points="150,453 250,453 200,483" />
        <rect x="110" y="258" width="25" height="225" />
        <rect x="265" y="258" width="25" height="225" />
      </g>
      <path d="M200 325 A45 45 0 0 1 200 415 A22.5 22.5 0 0 1 200 370 A22.5 22.5 0 0 0 200 325 Z" fill={red} />
    </svg>
  );
}

// English is paired with the US flag because English is also the storefront's
// dollar view — prices switch to USD with it. Stars are omitted: at this size
// fifty of them are a blur that reads as noise on the blue canton.
function FlagEN() {
  return (
    <svg viewBox="0 0 1300 650" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="block h-full w-full">
      <rect width="1300" height="650" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={i * 50} width="1300" height="50" fill="#B22234" />
      ))}
      <rect width="520" height="350" fill="#3C3B6E" />
    </svg>
  );
}

const FLAGS = { mn: FlagMN, en: FlagEN };

// tipSide: where the hover label opens — below in the header, above where the
// switch sits at the very bottom of the page (the footer's legal bar).
export default function LangSwitch({ className = '', tipSide = 'bottom' }) {
  const { locale, setLocale } = useLocale();
  return (
    <div className={`flex items-center ${className}`}>
      {LOCALES.map((l) => {
        const Flag = FLAGS[l.code];
        const active = locale === l.code;
        return (
          /* The flag is 26×13; the button around it is a full 44px square so
             it's a real tap target on a phone (the footer copy shows there). */
          <Tooltip key={l.code} label={l.name} side={tipSide}>
            <button
              type="button"
              onClick={() => setLocale(l.code)}
              aria-pressed={active}
              aria-label={l.name}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center transition-opacity duration-300 ${
                active ? '' : 'opacity-45 hover:opacity-100'
              }`}
            >
              {/* The active flag gets the house gold hairline, offset so it frames
                  the flag rather than sitting on its edge. */}
              <span
                className={`block h-[13px] w-[26px] overflow-hidden ${
                  active ? 'outline outline-1 outline-offset-2 outline-gold' : ''
                }`}
              >
                {Flag ? <Flag /> : l.label}
              </span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
