import { useEffect, useState } from 'react';
import { LOCALES } from '../lib/i18n';
import { useLocale } from '../context/LocaleContext';
import Tooltip from './Tooltip';

/* Flags drawn inline rather than as emoji: Windows has no flag emoji and
   renders 🇲🇳 as the bare letters "MN", which is exactly the text this replaced.
   Both are drawn on a 2:1 canvas and shown whole in a 2:1 tile. */

// Red–blue–red with a simplified Soyombo on the hoist stripe — at this size
// the full emblem's detail is sub-pixel, so this keeps its silhouette: flame,
// sun, moon, the two triangles and bars, the yin-yang, and the side pillars.
function FlagMN() {
  const red = '#C4272F';
  const gold = '#F9CF02';
  return (
    <svg viewBox="0 0 1200 600" preserveAspectRatio="xMinYMid slice" aria-hidden="true" className="block h-full w-full">
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
    <svg viewBox="0 0 1300 650" preserveAspectRatio="xMinYMid slice" aria-hidden="true" className="block h-full w-full">
      <rect width="1300" height="650" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={i * 50} width="1300" height="50" fill="#B22234" />
      ))}
      <rect width="520" height="350" fill="#3C3B6E" />
    </svg>
  );
}

const FLAGS = { mn: FlagMN, en: FlagEN };

// Outer tile sizes. The frame (1px gold border + 1px ink gap) takes 2px a side,
// leaving a 2:1 window — Mongolia's own proportion, so its flag shows whole
// (the US flag is 19:10, close enough that `slice` trims only a sliver).
const SIZES = {
  sm: 'h-5 w-9', // the header — a 16×32 flag among the 18px icons
  md: 'h-[22px] w-10', // the footer's legal bar — 18×36
  lg: 'h-7 w-[52px]', // the phone menu, sized for a thumb — 24×48
};

/* One flag face, finished like an enamel pin so it belongs to the black-and-
   gold house rather than sitting on it as a bright sticker: a gold hairline,
   a hairline of ink inside it, the flag a little muted (full colour on hover),
   and a soft diagonal sheen across the top. */
function Face({ Flag, label, back = false }) {
  return (
    <span
      className="absolute inset-0 border border-gold/70 bg-ink p-px [backface-visibility:hidden]"
      style={back ? { transform: 'rotateY(180deg)' } : undefined}
    >
      <span className="relative block h-full w-full overflow-hidden">
        <span className="block h-full w-full brightness-90 saturate-[.7] transition-[filter] duration-500 group-hover/flag:brightness-100 group-hover/flag:saturate-100">
          {Flag ? <Flag /> : label}
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/30 via-white/0 to-black/25"
        />
      </span>
    </span>
  );
}

/* The language switch as one flag tile that flips like a coin — the same idea
   as the watch theme switch: a single icon that shows the current state and
   animates when it changes. The tile shows the current language's flag; a
   click turns it over to the other flag as the site switches language. The
   hover label says where it will go ("English хэл рүү шилжих").

   The tile has two faces (front Mongolian, back English) on a card that only
   ever turns forward by 180°, so it always flips the same way. The angle
   follows the locale, so a switch made elsewhere — the footer's copy of this
   control — turns this tile too.

   tipSide: where the hover label opens — below in the header, above where the
   switch sits at the very bottom of the page (the footer's legal bar). */
export default function LangSwitch({ className = '', tipSide = 'bottom', tipAlign = 'center', size = 'md' }) {
  const { locale, setLocale, t } = useLocale();
  const [front, back] = LOCALES;
  const next = locale === front.code ? back : front;
  const [angle, setAngle] = useState(locale === back.code ? 180 : 0);

  // Turn the card whenever the face showing is not the current language.
  useEffect(() => {
    const showing = (angle / 180) % 2 === 0 ? front.code : back.code;
    if (showing !== locale) setAngle((a) => a + 180);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const label = t('lang.switchTo', { name: next.name });

  return (
    <Tooltip label={label} side={tipSide} align={tipAlign} className={className}>
      <button
        type="button"
        onClick={() => setLocale(next.code)}
        aria-label={label}
        className="group/flag inline-flex h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center focus-visible:outline-none"
      >
        <span className={`relative block [perspective:300px] ${SIZES[size]}`}>
          <span
            className="relative block h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] group-focus-visible/flag:outline group-focus-visible/flag:outline-1 group-focus-visible/flag:outline-offset-2 group-focus-visible/flag:outline-gold motion-reduce:transition-none"
            style={{ transform: `rotateY(${angle}deg)` }}
          >
            <Face Flag={FLAGS[front.code]} label={front.label} />
            <Face Flag={FLAGS[back.code]} label={back.label} back />
          </span>
        </span>
      </button>
    </Tooltip>
  );
}
