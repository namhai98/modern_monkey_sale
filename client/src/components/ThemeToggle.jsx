import { useState } from 'react';
import { Watch } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import IconButton from './IconButton';
import Tooltip from './Tooltip';

/* lucide's Watch as the theme's light switch — the house sells watches, so
   the toggle is one. Light theme: the watch is "on", gold with a soft glow.
   Dark theme: "off", an unlit outline. Each switch turns it one full
   revolution forward; the angle only ever grows (+360° a click), so it always
   turns clockwise and never unwinds. Under prefers-reduced-motion it simply
   changes colour. */
function WatchIcon({ lit, turns, className }) {
  return (
    <Watch
      aria-hidden="true"
      strokeWidth={1.5}
      className={`${className} transition-[transform,color,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${lit ? 'text-gold' : ''}`}
      style={{ transform: `rotate(${turns * 360}deg)`, filter: lit ? 'drop-shadow(0 0 3px var(--gold))' : 'none' }}
    />
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
