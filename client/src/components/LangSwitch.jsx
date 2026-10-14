import { useEffect, useState } from 'react';
import { LOCALES } from '../lib/i18n';
import { useLocale } from '../context/LocaleContext';
import Tooltip from './Tooltip';

// Tile sizes: the header, the footer's legal bar, and the phone menu (sized
// for a thumb).
const SIZES = {
  sm: 'h-5 w-9 text-[0.6rem]',
  md: 'h-[22px] w-10 text-[0.62rem]',
  lg: 'h-7 w-[52px] text-[0.7rem]',
};

/* One face of the tile: the language's code in the house's micro type inside
   a gold hairline. It used to show flags, which brought the only red and blue
   on the page; the code keeps the switch inside the site's single palette. */
function Face({ label, back = false }) {
  return (
    <span
      className="absolute inset-0 flex items-center justify-center border border-gold/70 bg-ink font-medium tracking-[0.12em] text-white/85 transition-colors duration-300 [backface-visibility:hidden] group-hover/flag:text-gold"
      style={back ? { transform: 'rotateY(180deg)' } : undefined}
    >
      {label}
    </span>
  );
}

/* The language switch as one tile that flips like a coin — the same idea as
   the watch theme switch: a single control that shows the current state and
   animates when it changes. The tile shows the current language's code; a
   click turns it over to the other as the site switches language. The hover
   label says where it will go ("English хэл рүү шилжих").

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
            <Face label={front.label} />
            <Face label={back.label} back />
          </span>
        </span>
      </button>
    </Tooltip>
  );
}
