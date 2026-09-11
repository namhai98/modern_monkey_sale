import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Button from '../components/Button';
import Field, { FormMessage } from '../components/Field';
import AuthShell from '../components/AuthShell';
import SocialSignIn from '../components/SocialSignIn';

function safeRedirect(target) {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
}

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login, register } = useAuth();
  const { t } = useLocale();
  useDocumentTitle(t('login.signIn'));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate(redirectTo);
    } catch (err) {
      setError(err.response?.data?.error || t('login.error'));
    }
  }

  return (
    <AuthShell
      eyebrow={t('account.eyebrow')}
      title={mode === 'login' ? t('login.welcome') : t('login.create')}
    >
      <form onSubmit={handleSubmit} className="space-y-7">
        {mode === 'register' && (
          <Field
            label={t('login.fullName')}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        )}
        <Field
          label={t('login.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Field
          label={t('login.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
        />
        <FormMessage>{error}</FormMessage>
        <Button as="button" type="submit" full size="lg">
          {mode === 'login' ? t('login.signIn') : t('login.createBtn')}
        </Button>
      </form>

      <SocialSignIn redirectTo={redirectTo} />

      <div className="mt-10 flex flex-col gap-4 border-t border-line pt-8">
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="link-lux micro w-fit text-left text-muted transition-colors hover:text-gold"
        >
          {mode === 'login' ? t('login.toRegister') : t('login.toLogin')}
        </button>
        {mode === 'login' && (
          <Link
            to="/forgot-password"
            className="link-lux micro w-fit text-muted transition-colors hover:text-gold"
          >
            {t('login.forgot')}
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
