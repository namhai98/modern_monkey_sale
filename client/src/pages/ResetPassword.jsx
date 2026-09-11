import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { useLocale } from '../context/LocaleContext';
import Button from '../components/Button';
import Field, { FormMessage } from '../components/Field';
import AuthShell from '../components/AuthShell';

export default function ResetPassword() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t('reset.mismatch'));
      return;
    }
    setSubmitting(true);
    try {
      await client.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || t('reset.fail'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell eyebrow={t('account.eyebrow')} title={t('reset.title')} lead={t('reset.noToken')}>
        <Link
          to="/forgot-password"
          className="link-lux micro w-fit text-gold"
        >
          {t('reset.requestNew')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow={t('account.eyebrow')} title={t('reset.title')}>
      {done ? (
        <p className="border-l-2 border-gold py-1 pl-4 text-sm leading-relaxed text-foreground">
          {t('reset.done')}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-7">
          <Field
            label={t('profile.newPw')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <Field
            label={t('reset.confirm')}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          <FormMessage>{error}</FormMessage>
          <Button as="button" type="submit" disabled={submitting} full size="lg">
            {submitting ? t('profile.saving') : t('reset.submit')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
