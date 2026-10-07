import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import IconButton from './IconButton';
import Tooltip from './Tooltip';

/* A wristwatch that is the theme's light switch — the house sells watches, so
   the toggle is one. Light theme: the watch is "on", its face lit gold and
   glowing. Dark theme: "off", an unlit outline. Each switch sweeps the hands
   one full turn forward while the face lights or dims.

   The spin is a rotation that only ever grows (+360° a click), so it always
   turns clockwise and never unwinds. Under prefers-reduced-motion the hands
   jump instead of sweeping; the light change alone still shows the state. */
function WatchIcon({ lit, turns, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* Strap ends and crown. */}
      <path d="M9 5.2 9.6 2h4.8l.6 3.2M9 18.8l.6 3.2h4.8l.6-3.2" />
      <path d="M19 11v2" />
      {/* The face — filled with a gold glow when the watch is on. */}
      <circle
        cx="12"
        cy="12"
        r="6.75"
        className="transition-[fill,filter] duration-500"
        style={{
          fill: lit ? 'color-mix(in oklab, var(--color-gold) 35%, transparent)' : 'transparent',
          filter: lit ? 'drop-shadow(0 0 3px var(--color-gold))' : 'none',
        }}
      />
      {/* Hands: hour at ten past, minute at twelve. */}
      <g
        className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `rotate(${turns * 360}deg)`, transformOrigin: '12px 12px' }}
      >
        <path d="M12 12V8.2" className={`transition-colors duration-500 ${lit ? 'stroke-gold' : ''}`} />
        <path d="M12 12l2.4 1.4" className={`transition-colors duration-500 ${lit ? 'stroke-gold' : ''}`} />
      </g>
    </svg>
  );
}

/* It always sits on a dark surface — the header glass and the mobile menu.

   variant="disc" (default): the house round icon button (IconButton, the one
   place radius is allowed) — the phone menu, where it stands alone on a row.
   variant="plain": a bare 44px icon, the same as search/account/bag, so the
   header reads as one even row of icons instead of a ringed disc among them. */
export default function ThemeToggle({ className = '', variant = 'disc' }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const [turns, setTurns] = useState(0);
  const dark = theme === 'dark';
  // The only text this control has is its label, so it is the only thing a
  // screen-reader user hears — it cannot stay English on a Mongolian site.
  const label = t(dark ? 'theme.toLight' : 'theme.toDark');

  function onToggle() {
    setTurns((n) => n + 1);
    toggleTheme();
  }

  const icon = (
    <WatchIcon
      lit={!dark}
      turns={turns}
      className={variant === 'plain' ? 'h-[1.3rem] w-[1.3rem]' : 'h-[1.15rem] w-[1.15rem]'}
    />
  );

  return (
    <Tooltip label={label} className={className}>
      {variant === 'plain' ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={label}
          className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center text-white/80 transition-colors duration-300 hover:text-gold"
        >
          {icon}
        </button>
      ) : (
        <IconButton tone="dark" size="sm" onClick={onToggle} aria-label={label}>
          {icon}
        </IconButton>
      )}
    </Tooltip>
  );
}
