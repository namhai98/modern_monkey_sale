import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';

/* Matches the presentation site's <Breadcrumb>: 11px uppercase at 0.24em,
   chevron separators, "Home" always injected first, and the last crumb in gold
   carrying aria-current. Pass items as [{ label, to? }] — the final crumb
   simply omits `to`. */
export default function Breadcrumb({ items = [], dark = false, className = '' }) {
  const { t } = useLocale();
  const link = dark
    ? 'transition-colors hover:text-gold text-white/55'
    : 'transition-colors hover:text-gold';

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        className={`flex flex-wrap items-center gap-2 micro tracking-[0.24em] ${
          dark ? 'text-white/55' : 'text-muted'
        }`}
      >
        <li>
          <Link to="/" className={link}>
            {t('nav.home')}
          </Link>
        </li>
        {items.map((item) => (
          <Fragment key={item.label}>
            <li aria-hidden="true" className="opacity-50">
              <Chevron />
            </li>
            <li>
              {item.to ? (
                <Link to={item.to} className={link}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-gold">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
