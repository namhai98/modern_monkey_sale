import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import Button from '../components/Button';
import Field, { FormMessage } from '../components/Field';
import Icon from '../components/Icon';
import ImageFallback from '../components/ImageFallback';
import OrderStatusBadge from '../components/OrderStatusBadge';
import PageHero from '../components/PageHero';
import Section from '../components/Section';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useMoney } from '../lib/price';

// The profile's own order-history widget shows only the most recent handful;
// the full list (and search/filtering, if that ever lands) stays on /orders.
const RECENT_ORDERS = 5;

export default function Profile() {
  const { user, updateUser, logoutEverywhere } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const money = useMoney();
  const avatarInputRef = useRef(null);

  const [name, setName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState(null);

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState(null);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  // /auth/me reports these; default to a password account so a cached user
  // object from before social sign-in existed still renders the normal form.
  const hasPassword = user.has_password !== false;
  const linked = user.providers || [];

  useEffect(() => {
    client
      .get('/orders/mine')
      .then((res) => setOrders(res.data))
      .finally(() => setOrdersLoading(false));
  }, []);

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

  async function pickAvatar(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be re-picked later (e.g. after removing it)
    if (!file) return;
    setAvatarBusy(true);
    setAvatarMsg(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const { data } = await client.put('/users/me/avatar', form);
      updateUser({ ...user, ...data.user });
    } catch (err) {
      setAvatarMsg({ ok: false, text: err.response?.data?.error || t('profile.avatarFail') });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setAvatarMsg(null);
    try {
      const { data } = await client.delete('/users/me/avatar');
      updateUser({ ...user, ...data.user });
    } catch (err) {
      setAvatarMsg({ ok: false, text: err.response?.data?.error || t('profile.avatarFail') });
    } finally {
      setAvatarBusy(false);
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
        <p className="micro mt-6 tracking-[0.2em] text-muted">
          {user.email} · {user.role}
        </p>
      </PageHero>

      <Section>
        {/* Single column on mobile; from lg up, a fixed-width identity/settings
            rail sits beside a wider main column — the profile finally uses the
            desktop width instead of sitting in a phone-width strip in the
            middle of the screen. */}
        <div className="grid gap-14 lg:grid-cols-[22rem_1fr] lg:gap-20">
          <div className="space-y-14">
            <section className="flex items-center gap-6">
              <div className="relative shrink-0">
                <ImageFallback
                  src={user.avatar_url}
                  alt={user.name}
                  className="h-24 w-24 rounded-full object-cover md:h-28 md:w-28"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarBusy}
                  aria-label={t('profile.avatarChange')}
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-background text-foreground transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
                >
                  <Icon name="edit" className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={pickAvatar}
                />
              </div>
              <div className="min-w-0">
                <p className="micro tracking-[0.2em] text-muted">
                  {avatarBusy ? t('profile.avatarUploading') : t('profile.avatarHint')}
                </p>
                {user.avatar_url && !avatarBusy && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="link-lux micro mt-2 tracking-[0.2em] text-muted transition-colors hover:text-gold"
                  >
                    {t('profile.avatarRemove')}
                  </button>
                )}
                {avatarMsg && (
                  <div className="mt-2">
                    <FormMessage tone={avatarMsg.ok ? 'info' : 'error'}>{avatarMsg.text}</FormMessage>
                  </div>
                )}
              </div>
            </section>

            {/* No opener here: the field's own label already says "Name", and
                the hero above already says "Profile". */}
            <section className="border-t border-line pt-14">
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
          </div>

          <div className="space-y-14 border-t border-line pt-14 lg:border-t-0 lg:border-l lg:pl-20 lg:pt-0">
            <section>
              <div className="mb-6 flex items-end justify-between gap-4">
                <p className="eyebrow">{t('profile.orders')}</p>
                <Link to="/orders" className="link-lux micro tracking-[0.2em] text-gold">
                  {t('profile.ordersViewAll')}
                </Link>
              </div>

              {ordersLoading && (
                <div className="divide-y divide-line border-y border-line">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-6">
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              )}

              {!ordersLoading && orders.length === 0 && (
                <div className="border-y border-line py-8">
                  <p className="text-sm text-muted">{t('orders.none')}</p>
                  <Link
                    to="/shop?all=1"
                    className="link-lux micro mt-4 inline-block tracking-[0.2em] text-gold"
                  >
                    {t('orders.start')}
                  </Link>
                </div>
              )}

              {!ordersLoading && orders.length > 0 && (
                <div className="divide-y divide-line border-y border-line">
                  {orders.slice(0, RECENT_ORDERS).map((order) => (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="group flex items-center justify-between gap-5 py-6"
                    >
                      <div className="min-w-0">
                        <p className="text-base transition-colors duration-300 group-hover:text-gold">
                          {t('orders.order', { id: order.id })}
                        </p>
                        <p className="micro mt-2 tracking-[0.2em] text-muted">
                          {new Date(order.created_at).toLocaleDateString()}
                          {order.item_count != null &&
                            ` · ${t('orders.items', { n: order.item_count })}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <p className="text-sm tabular-nums text-foreground">{money(order.total)}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="border-t border-line pt-14 lg:max-w-md">
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
          </div>
        </div>
      </Section>
    </>
  );
}
