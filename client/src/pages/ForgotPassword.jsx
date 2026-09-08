import { useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useLocale } from '../context/LocaleContext';
import Button from '../components/Button';

const field =
  'w-full bg-transparent border-b border-line py-3 text-sm placeholder:text-stone focus:outline-none focus:border-ink transition-colors';

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

  return (
    <div className="max-w-sm mx-auto px-6 py-24">
      <p className="eyebrow text-stone">{t('account.eyebrow')}</p>
      <h1 className="font-display text-4xl mt-3 mb-10">{t('forgot.title')}</h1>

      {sent ? (
        <div className="space-y-6">
          <p className="text-sm text-stone leading-relaxed">
            {t('forgot.sent', { email })}
          </p>
          <Link to="/login" className="eyebrow link-underline">
            {t('forgot.back')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-sm text-stone">{t('forgot.lead')}</p>
          <input
            type="email"
            placeholder={t('login.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            required
          />
          <Button as="button" type="submit" disabled={submitting} full size="lg">
            {submitting ? t('forgot.sending') : t('forgot.send')}
          </Button>
          <Link to="/login" className="block eyebrow link-underline w-fit">
            {t('forgot.back')}
          </Link>
        </form>
      )}
    </div>
  );
}
