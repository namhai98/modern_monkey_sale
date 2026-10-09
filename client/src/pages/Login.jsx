import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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

// The server's own minimum (see the register route) — said up front.
const MIN_PASSWORD = 8;

/* Sign in at /login, create an account at /register — one form, the mode
   taken from the URL, so each has its own address, title and history entry
   and can be linked to directly. */
export default function Login() {
  const { pathname } = useLocation();
  const mode = pathname === '/register' ? 'register' : 'login';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();
  const { t, locale } = useLocale();
  useDocumentTitle(mode === 'login' ? t('login.signIn') : t('login.create'));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));
  // Switching between the two keeps where the shopper was headed.
  const query = searchParams.get('redirect') ? `?redirect=${encodeURIComponent(redirectTo)}` : '';

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate(redirectTo);
    } catch (err) {
      setError(apiErrorMessage(err, { t, locale, fallbackKey: 'login.error' }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow={mode === 'login' ? t('login.signIn') : t('login.newAccount')}
      title={mode === 'login' ? t('login.welcome') : t('login.create')}
    >
      {/* key={mode}: a fresh form when the mode changes, so a half-typed
          error or name never carries over between sign-in and sign-up. */}
      <form key={mode} onSubmit={handleSubmit} className="space-y-7">
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
          minLength={mode === 'register' ? MIN_PASSWORD : undefined}
          hint={mode === 'register' ? t('login.passwordHint', { n: MIN_PASSWORD }) : undefined}
          required
        />
        <FormMessage>{error}</FormMessage>
        <Button as="button" type="submit" full size="lg" disabled={submitting} aria-busy={submitting}>
          {mode === 'login'
            ? submitting
              ? t('login.signingIn')
              : t('login.signIn')
            : submitting
              ? t('login.creating')
              : t('login.createBtn')}
        </Button>
      </form>

      <SocialSignIn redirectTo={redirectTo} />

      <div className="mt-10 flex flex-col gap-4 border-t border-line pt-8">
        <TextButton to={`${mode === 'login' ? '/register' : '/login'}${query}`} className="w-fit text-left">
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
