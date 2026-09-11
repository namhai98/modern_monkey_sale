import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import AuthShell from '../components/AuthShell';
import Button from '../components/Button';
import { FormMessage } from '../components/Field';

/* Landing strip for a social sign-in. The server has already set the refresh
   cookie; this exchanges it for an access token and moves on. On the happy path
   the shopper sees this for a fraction of a second. */

function safeRedirect(target) {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
}

export default function AuthCallback() {
  const [params] = useSearchParams();
  const { completeOAuth } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  useDocumentTitle(t('login.signIn'));

  const providerError = params.get('error');
  const redirectTo = safeRedirect(params.get('redirect'));
  const [failed, setFailed] = useState(providerError || null);
  const ran = useRef(false);

  useEffect(() => {
    if (providerError || ran.current) return;
    ran.current = true;
    completeOAuth()
      .then(() => navigate(redirectTo, { replace: true }))
      .catch(() => setFailed('failed'));
    // completeOAuth and navigate are stable for this screen's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerError]);

  if (!failed) {
    return (
      <AuthShell eyebrow={t('account.eyebrow')} title={t('oauth.signingIn')}>
        <p className="text-sm leading-relaxed text-muted" role="status">
          {t('oauth.wait')}
        </p>
      </AuthShell>
    );
  }

  // `email_taken` is the one worth explaining at length: it means the address is
  // already a password account, and we refuse to merge on an address the
  // provider has not itself verified.
  const known = ['denied', 'no_email', 'email_taken', 'disabled', 'state', 'provider_disabled'];
  const message = known.includes(failed) ? t(`oauth.error.${failed}`) : t('oauth.error.failed');

  return (
    <AuthShell eyebrow={t('account.eyebrow')} title={t('oauth.failedTitle')}>
      <FormMessage>{message}</FormMessage>
      <div className="mt-10 flex flex-col gap-5">
        <Button to="/login" variant="outline-dark" size="lg" full>
          {t('oauth.backToSignIn')}
        </Button>
        <Link
          to="/"
          className="link-lux micro w-fit text-muted transition-colors hover:text-gold"
        >
          {t('notFound.home')}
        </Link>
      </div>
    </AuthShell>
  );
}
