import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { site, telHref } from '../lib/site';
import Icon from './Icon';
import LangSwitch from './LangSwitch';
import ThemeToggle from './ThemeToggle';
import CurrencyBadge from './CurrencyBadge';

const STAFF_ROLES = ['staff', 'manager', 'admin'];

/* The menu behind the hamburger, on phones and tablets alike.
   Ordered for the hand that holds the device: the browsing rows a shopper came
   for sit in the middle of the panel where a thumb rests, and the settings they
   touch once a year — account, language, currency, theme, the boutique line —
   sit at the bottom. Nothing important is parked against the top edge, which on
   a 6.7" phone is the one place a thumb cannot reach.

   Rows are 56px tall with full-bleed hit areas, so a tap that lands between two
   labels still lands on one of them. */

const SETTING_ROW = 'flex min-h-[3rem] items-center justify-between gap-6';
const SETTING_LABEL = 'micro text-white/40';
const ACCOUNT_LINK =
  'link-lux flex min-h-[2.75rem] w-fit items-center text-sm text-white/65 transition-colors duration-300 hover:text-white';

/* LangSwitch and ThemeToggle are sized for a desktop header — 17px of text and
   a 36px disc. In a menu meant for thumbs they need 44px, and these child
   selectors are how to say so from the outside: `.wrapper button` outranks the
   component's own `.h-9` on specificity, so it wins without depending on which
   utility Tailwind happens to emit last. */
const TAP_44 = '[&_button]:min-h-[2.75rem] [&_button]:px-1';
const TAP_DISC = '[&>button]:h-11 [&>button]:w-11';

export default function MobileMenu({ links, onNavigate, onSearch, closing }) {
  const { user } = useAuth();
  const { t } = useLocale();
  const phone = site.phones[0];

  return (
    <div
      id="site-menu"
      /* Below the header, above the floating contact column — which is z-40 and
         renders later in the document, so without this it would sit on top of
         the open menu. */
      className={`fixed inset-x-0 bottom-0 top-16 z-[45] overflow-y-auto overscroll-contain bg-ink md:top-[4.5rem] hdr:hidden ${
        closing ? 'panel-out' : 'panel-in'
      }`}
    >
      <nav className="container-bar flex min-h-full flex-col py-6" aria-label={t('nav.menu')}>
        {/* Search leads: it is the one control a shopper reaches for before
            they know which category they want. */}
        <button
          type="button"
          onClick={onSearch}
          className="group flex min-h-[3.5rem] w-full items-center justify-between border-b border-white/10 py-4 text-left"
        >
          <span className="micro text-white/50 transition-colors group-hover:text-white">
            {t('nav.search')}
          </span>
          <Icon name="search" className="h-5 w-5 text-white/40 transition-colors group-hover:text-gold" />
        </button>

        {/* The last link drops its rule: the settings block below draws its own,
            and two hairlines with a gap between them read as an empty row. */}
        <div className="flex flex-col [&>a:last-child]:border-b-0">
          {links.map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={onNavigate}
              style={{ animationDelay: `${0.05 + i * 0.045}s` }}
              className={`fade-up heading-serif flex min-h-[3.5rem] items-center border-b border-white/10 py-3 text-2xl transition-colors duration-300 hover:text-gold md:text-3xl ${
                l.gold ? 'text-gold' : 'text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Pushes the settings block to the bottom of a tall viewport without
            stranding it off-screen on a short one. */}
        <div className="mt-auto pt-8">
          <div className="flex flex-col gap-1 border-t border-white/10 pt-6">
            {user ? (
              <>
                <p className="micro pb-2 text-gold/80">{user.name}</p>
                <Link to="/profile" onClick={onNavigate} className={ACCOUNT_LINK}>
                  {t('nav.profile')}
                </Link>
                <Link to="/orders" onClick={onNavigate} className={ACCOUNT_LINK}>
                  {t('nav.orders')}
                </Link>
                {STAFF_ROLES.includes(user.role) && (
                  <Link to="/admin/orders" onClick={onNavigate} className={ACCOUNT_LINK}>
                    {t('nav.admin')}
                  </Link>
                )}
              </>
            ) : (
              <Link to="/login" onClick={onNavigate} className={ACCOUNT_LINK}>
                {t('nav.login')}
              </Link>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-6">
            <div className={SETTING_ROW}>
              <span className={SETTING_LABEL}>{t('nav.language')}</span>
              <LangSwitch className={TAP_44} />
            </div>
            <div className={SETTING_ROW}>
              <span className={SETTING_LABEL}>{t('nav.currency')}</span>
              <CurrencyBadge className="text-white/70 opacity-100" />
            </div>
            <div className={`${SETTING_ROW} ${TAP_DISC}`}>
              <span className={SETTING_LABEL}>{t('nav.theme')}</span>
              <ThemeToggle />
            </div>
          </div>

          <a
            href={telHref(phone)}
            className="mt-6 flex min-h-[3rem] items-center gap-3 border-t border-white/10 pt-6 text-sm tracking-[0.2em] text-gold"
          >
            <Icon name="phone" className="h-4 w-4" />
            {phone}
          </a>
        </div>
      </nav>
    </div>
  );
}
