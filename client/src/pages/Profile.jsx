import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import client from '../api/client';
import Button from '../components/Button';
import Field, { FormMessage } from '../components/Field';
import Icon from '../components/Icon';
import PageHero from '../components/PageHero';
import { Container } from '../components/Section';

export default function Profile() {
  const { user, updateUser, logoutEverywhere } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [name, setName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  // /auth/me reports these; default to a password account so a cached user
  // object from before social sign-in existed still renders the normal form.
  const hasPassword = user.has_password !== false;
  const linked = user.providers || [];

  async function saveName(e) {
    e.preventDefault();
    setSavingName(true);
    setNameMsg(null);
    try {
      const { data } = await client.put('/users/me', { name });
      updateUser({ ...user, ...data.user });
      setNameMsg({ ok: true, text: t('profile.saved') });
    } catch (err) {
      setNameMsg({ ok: false, text: err.response?.data?.error || t('profile.saveFail') });
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setSavingPw(true);
    setPwMsg(null);
    try {
      await client.put('/users/me/password', {
        ...(hasPassword ? { currentPassword } : {}),
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setPwMsg({ ok: true, text: t('profile.pwChanged') });
      if (!hasPassword) updateUser({ ...user, has_password: true });
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.error || t('profile.pwFail') });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <>
      <PageHero
        compact
        eyebrow={t('account.eyebrow')}
        title={t('profile.title')}
        crumbs={[{ label: t('profile.title') }]}
      >
        <p className="micro mt-6 tracking-[0.2em] text-white/55">
          {user.email} · {user.role}
        </p>
      </PageHero>

      <Container className="max-w-md space-y-14 py-14 md:py-20">
        {/* No opener here: the field's own label already says "Name", and the
            hero above already says "Profile". */}
        <section>
          <form onSubmit={saveName} className="space-y-6">
            <Field
              label={t('profile.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
            {nameMsg && (
              <FormMessage tone={nameMsg.ok ? 'info' : 'error'}>{nameMsg.text}</FormMessage>
            )}
            <Button as="button" disabled={savingName} variant="outline-dark">
              {savingName ? t('profile.saving') : t('profile.save')}
            </Button>
          </form>
        </section>

        {linked.length > 0 && (
          <section className="border-t border-line pt-14">
            <p className="eyebrow mb-6">{t('profile.connected')}</p>
            <ul className="space-y-4">
              {linked.map((p) => (
                <li key={p} className="flex items-center gap-3 text-sm text-muted">
                  <Icon name={p} className="h-4 w-4 text-gold" />
                  {t(`login.with${p[0].toUpperCase()}${p.slice(1)}`)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="border-t border-line pt-14">
          <p className="eyebrow mb-6">{hasPassword ? t('profile.changePw') : t('profile.setPw')}</p>
          {/* An account created through Google or Facebook has no password to
              confirm, so the current-password field would be unfillable. */}
          {!hasPassword && (
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted">
              {t('profile.setPwNote')}
            </p>
          )}
          <form onSubmit={savePassword} className="space-y-6">
            {hasPassword && (
              <Field
                label={t('profile.currentPw')}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            )}
            <Field
              label={t('profile.newPw')}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              hint={t('profile.pwNote')}
              required
            />
            {pwMsg && <FormMessage tone={pwMsg.ok ? 'info' : 'error'}>{pwMsg.text}</FormMessage>}
            <Button as="button" disabled={savingPw} variant="outline-dark">
              {savingPw
                ? t('profile.saving')
                : hasPassword
                  ? t('profile.changePw')
                  : t('profile.setPw')}
            </Button>
          </form>
        </section>

        <section className="border-t border-line pt-14">
          <p className="eyebrow mb-6">{t('profile.sessions')}</p>
          <button
            onClick={async () => {
              await logoutEverywhere();
              navigate('/login');
            }}
            className="link-lux micro text-muted transition-colors hover:text-gold"
          >
            {t('profile.logoutAll')}
          </button>
        </section>
      </Container>
    </>
  );
}
