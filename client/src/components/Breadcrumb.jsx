import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import Icon from './Icon';

/* Matches the presentation site's <Breadcrumb>: 11px uppercase on the meta
   rung, chevron separators, "Home" always injected first, and the last crumb in
   gold carrying aria-current. Pass items as [{ label, to? }] — the final crumb
   simply omits `to`. */
export default function Breadcrumb({ items = [], className = '' }) {
  const { t } = useLocale();
  const link = 'transition-colors hover:text-gold';

  return (
    <nav aria-label={t('nav.breadcrumb')} className={className}>
      <ol className="flex flex-wrap items-center gap-2 micro tracking-meta text-muted">
        <li>
          <Link to="/" className={link}>
            {t('nav.home')}
          </Link>
        </li>
        {items.map((item) => (
          <Fragment key={item.label}>
            <li aria-hidden="true" className="opacity-50">
              <Icon name="chevronDown" className="h-3 w-3 -rotate-90" />
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
