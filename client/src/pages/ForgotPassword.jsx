import { useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useLocale } from '../context/LocaleContext';
import Button from '../components/Button';
import Field from '../components/Field';
import AuthShell from '../components/AuthShell';

export default function ForgotPassword() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await client.post('/auth/forgot-password', { email });
    } catch {
      // The endpoint always succeeds; ignore transport errors for the same UX.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  const back = (
    <Link
      to="/login"
      className="link-lux micro w-fit text-muted transition-colors hover:text-gold"
    >
      {t('forgot.back')}
    </Link>
  );

  return (
    <AuthShell
      eyebrow={t('account.eyebrow')}
      title={t('forgot.title')}
      lead={sent ? null : t('forgot.lead')}
    >
      {sent ? (
        <div className="space-y-8">
          <p className="border-l-2 border-gold py-1 pl-4 text-sm leading-relaxed text-foreground">
            {t('forgot.sent', { email })}
          </p>
          {back}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-7">
          <Field
            label={t('login.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Button as="button" type="submit" disabled={submitting} full size="lg">
            {submitting ? t('forgot.sending') : t('forgot.send')}
          </Button>
          <div className="border-t border-line pt-6">{back}</div>
        </form>
      )}
    </AuthShell>
  );
}
