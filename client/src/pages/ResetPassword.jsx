import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { useLocale } from '../context/LocaleContext';
import Button from '../components/Button';

const field =
  'w-full bg-transparent border-b border-line py-3 text-sm placeholder:text-stone focus:outline-none focus:border-ink transition-colors';

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
      <div className="max-w-sm mx-auto px-6 py-24">
        <p className="text-sm text-stone mb-4">{t('reset.noToken')}</p>
        <Link to="/forgot-password" className="eyebrow link-underline">
          {t('reset.requestNew')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-24">
      <p className="eyebrow text-stone">{t('account.eyebrow')}</p>
      <h1 className="font-display text-4xl mt-3 mb-10">{t('reset.title')}</h1>

      {done ? (
        <p className="text-sm text-stone">{t('reset.done')}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="password"
            placeholder={t('profile.newPw')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
            required
          />
          <input
            type="password"
            placeholder={t('reset.confirm')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={field}
            required
          />
          {error && <p className="text-red-700 text-sm">{error}</p>}
          <Button as="button" type="submit" disabled={submitting} full size="lg">
            {submitting ? t('profile.saving') : t('reset.submit')}
          </Button>
        </form>
      )}
    </div>
  );
}
