import { useState } from 'react';
import client from '../api/client';
import { useLocale } from '../context/LocaleContext';
import Button from '../components/Button';
import Field from '../components/Field';
import AuthShell from '../components/AuthShell';
import TextButton from '../components/TextButton';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const value = email.trim();
    if (!value) {
      setError(t('forgot.emailRequired'));
      return;
    }
    if (!EMAIL_RE.test(value)) {
      setError(t('forgot.emailInvalid'));
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await client.post('/auth/forgot-password', { email: value });
    } catch {
      // The endpoint always succeeds; ignore transport errors for the same UX.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  const back = (
    <TextButton to="/login" className="w-fit">
      {t('forgot.back')}
    </TextButton>
  );

  return (
    <AuthShell
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
        <form onSubmit={handleSubmit} noValidate className="space-y-7">
          <Field
            label={t('forgot.emailLabel')}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            error={error}
            autoComplete="email"
            disabled={submitting}
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
