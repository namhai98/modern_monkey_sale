import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const OPTIONS = [
  { key: 'dark', icon: 'moon', label: 'Dark' },
  { key: 'light', icon: 'sun', label: 'Light' },
];

// Same visual language as LangSwitch — two options side by side, the active
// one in gold, separated by a hairline slash.
export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {OPTIONS.map((o, i) => (
        <span key={o.key} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-current/30">/</span>}
          <button
            type="button"
            onClick={() => setTheme(o.key)}
            aria-pressed={theme === o.key}
            aria-label={o.label}
            title={o.label}
            className={theme === o.key ? 'text-champagne' : 'opacity-40 hover:opacity-70'}
          >
            <Icon name={o.icon} className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
