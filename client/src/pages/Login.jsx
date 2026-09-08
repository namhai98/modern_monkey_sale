import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import Button from '../components/Button';

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

  const field =
    'w-full bg-transparent border-b border-line py-3 text-sm placeholder:text-stone focus:outline-none focus:border-ink transition-colors';

  return (
    <div className="max-w-sm mx-auto px-6 py-24">
      <p className="eyebrow text-stone">{t('account.eyebrow')}</p>
      <h1 className="font-display text-4xl mt-3 mb-10">
        {mode === 'login' ? t('login.welcome') : t('login.create')}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'register' && (
          <input
            type="text"
            placeholder={t('login.fullName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
            required
          />
        )}
        <input
          type="email"
          placeholder={t('login.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
          required
        />
        <input
          type="password"
          placeholder={t('login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
          required
        />
        {error && <p className="text-red-700 text-sm">{error}</p>}
        <Button as="button" type="submit" full size="lg">
          {mode === 'login' ? t('login.signIn') : t('login.createBtn')}
        </Button>
      </form>

      <div className="mt-8 flex flex-col gap-3 text-sm text-stone">
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="link-underline text-left w-fit"
        >
          {mode === 'login' ? t('login.toRegister') : t('login.toLogin')}
        </button>
        {mode === 'login' && (
          <Link to="/forgot-password" className="link-underline w-fit">
            {t('login.forgot')}
          </Link>
        )}
      </div>
    </div>
  );
}
