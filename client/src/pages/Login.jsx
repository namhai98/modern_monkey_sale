import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { apiErrorMessage } from '../lib/apiError';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Button from '../components/Button';
import Field, { FormMessage } from '../components/Field';
import AuthShell from '../components/AuthShell';
import SocialSignIn from '../components/SocialSignIn';
import TextButton from '../components/TextButton';

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
  const { t, locale } = useLocale();
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
      setError(apiErrorMessage(err, { t, locale, fallbackKey: 'login.error' }));
    }
  }

  return (
    <AuthShell
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
        <TextButton
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="w-fit text-left"
        >
          {mode === 'login' ? t('login.toRegister') : t('login.toLogin')}
        </TextButton>
        {mode === 'login' && (
          <TextButton to="/forgot-password" className="w-fit">
            {t('login.forgot')}
          </TextButton>
        )}
      </div>
    </AuthShell>
  );
}
