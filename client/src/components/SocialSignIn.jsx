import { useEffect, useState } from 'react';
import client from '../api/client';
import { useLocale } from '../context/LocaleContext';
import Button from './Button';
import Icon from './Icon';

/* The Google / Facebook buttons.
 *
 * These are plain links, not fetch calls: OAuth needs a top-level navigation so
 * the provider can show its own consent screen on its own origin. The server
 * handles the whole exchange and bounces the shopper back to /auth/callback.
 *
 * Each button renders only once its provider is configured on the API, so the
 * screen stays honest before the credentials are in place.
 */
export default function SocialSignIn({ redirectTo = '/' }) {
  const { t } = useLocale();
  const [providers, setProviders] = useState(null);

  useEffect(() => {
    let cancelled = false;
    client
      .get('/auth/providers')
      .then(({ data }) => {
        if (!cancelled) setProviders(data);
      })
      .catch(() => {
        if (!cancelled) setProviders({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabled = [
    { id: 'google', label: t('login.withGoogle') },
    { id: 'facebook', label: t('login.withFacebook') },
  ].filter((p) => providers?.[p.id]);

  if (enabled.length === 0) return null;

  const href = (id) =>
    `/api/auth/oauth/${id}?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="mt-10">
      {/* Hairline rule with the label sitting in a gap in it — the house has no
          filled dividers. */}
      <div className="flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="micro text-muted">{t('login.or')}</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="mt-8 space-y-4">
        {enabled.map((p) => (
          <Button key={p.id} href={href(p.id)} variant="outline-dark" size="lg" full>
            <Icon name={p.id} className="h-4 w-4" />
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
