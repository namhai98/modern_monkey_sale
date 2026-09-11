import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

/* The presentation site's theme toggle: one 36px round control — the single
   place radius is allowed — with a hairline drawn in the current text colour,
   turning gold on hover. It shows the theme you would switch TO (a sun while
   the page is dark), which is the convention the marketing site follows. */
export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/20 transition-colors duration-300 hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${className}`}
    >
      <Icon name={dark ? 'sun' : 'moon'} className="h-4 w-4" />
    </button>
  );
}
