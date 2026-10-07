import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import Icon from './Icon';
import IconButton from './IconButton';
import Tooltip from './Tooltip';

/* The theme switch: the house round icon button (IconButton, the one place
   radius is allowed). It always sits on a dark surface — the header glass and
   the mobile menu — hence tone="dark". It shows the theme you would switch TO
   (a sun while the page is dark), the convention the marketing site follows. */
export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const dark = theme === 'dark';
  // The only text this control has is its label, so it is the only thing a
  // screen-reader user hears — it cannot stay English on a Mongolian site.
  const label = t(dark ? 'theme.toLight' : 'theme.toDark');

  return (
    <Tooltip label={label} className={className}>
      <IconButton tone="dark" size="sm" onClick={toggleTheme} aria-label={label}>
        <Icon name={dark ? 'sun' : 'moon'} className="h-4 w-4" />
      </IconButton>
    </Tooltip>
  );
}
