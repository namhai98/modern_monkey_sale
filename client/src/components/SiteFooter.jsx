import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { site, telHref } from '../lib/site';
import Icon from './Icon';
import LangSwitch from './LangSwitch';

/* The presentation site's footer, column for column: a fixed-dark band in both
   themes, gold 0.32em column headers, link-lux links at text-white/65, round
   social buttons under the brand blurb, a boutique address block with gold
   icons, then the giant ghosted wordmark and the legal bar, each separated by a
   white/10 hairline. The newsletter sign-up is the storefront's own addition,
   set in the same underline-field vocabulary as every other form here. */

const COL_HEAD = 'micro tracking-[0.32em] text-gold';
const COL_LINK = 'link-lux text-sm text-white/65 transition-colors hover:text-white';
const SOCIAL =
  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition-colors duration-300 hover:border-gold hover:text-gold';

export default function SiteFooter({ flush = false }) {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  return (
    <footer className={`bg-ink text-white ${flush ? '' : 'mt-20 md:mt-32'}`}>
      <div className="container-lux grid gap-10 py-14 md:grid-cols-2 md:gap-14 md:py-20 lg:grid-cols-4">
        <div>
          <p className="heading-serif text-xl uppercase tracking-[0.28em]">
            Modern<span className="text-gold"> Monkey</span>
          </p>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/55">{t('footer.blurb')}</p>

          <div className="mt-8 flex gap-4">
            <a
              href={site.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('float.facebook')}
              className={SOCIAL}
            >
              <Icon name="facebook" className="h-4 w-4" />
            </a>
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('float.instagram')}
              className={SOCIAL}
            >
              <Icon name="instagram" className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-10 max-w-xs">
            <p className={COL_HEAD}>{t('footer.letter.eyebrow')}</p>
            {done ? (
              <p className="mt-4 text-sm leading-relaxed text-white/55">{t('footer.letter.thanks')}</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setDone(true);
                }}
                className="mt-4 flex items-center gap-4 border-b border-white/20 pb-2 transition-colors focus-within:border-gold"
              >
                <label htmlFor="footer-letter" className="sr-only">
                  {t('footer.letter.title')}
                </label>
                <input
                  id="footer-letter"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('footer.letter.placeholder')}
                  className="min-w-0 flex-1 bg-transparent py-1 text-sm text-white placeholder:text-white/35 focus:outline-none"
                />
                <button type="submit" className="link-lux micro shrink-0 text-gold">
                  {t('footer.letter.subscribe')}
                </button>
              </form>
            )}
          </div>
        </div>

        <nav aria-label={t('footer.col.shop')}>
          <p className={COL_HEAD}>{t('footer.col.shop')}</p>
          <ul className="mt-6 space-y-3.5">
            <li>
              <Link to="/shop?category=bags" className={COL_LINK}>
                {t('nav.bags')}
              </Link>
            </li>
            <li>
              <Link to="/shop?category=watches" className={COL_LINK}>
                {t('nav.watches')}
              </Link>
            </li>
            <li>
              <Link to="/shop?category=apparel" className={COL_LINK}>
                {t('nav.apparel')}
              </Link>
            </li>
            <li>
              <Link to="/shop?all=1" className={COL_LINK}>
                {t('nav.all')}
              </Link>
            </li>
            <li>
              <Link to="/shop?sale=1" className={`${COL_LINK} text-gold/80 hover:text-gold`}>
                {t('nav.sale')}
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <p className={COL_HEAD}>{t('footer.col.care')}</p>
          <ul className="mt-6 space-y-3.5 text-sm text-white/65">
            <li>{t('footer.care.shipping')}</li>
            <li>{t('footer.care.product')}</li>
            <li>{t('footer.care.contact')}</li>
          </ul>

          <nav aria-label={t('footer.col.account')} className="mt-10">
            <p className={COL_HEAD}>{t('footer.col.account')}</p>
            <ul className="mt-6 space-y-3.5">
              <li>
                <Link to="/orders" className={COL_LINK}>
                  {t('nav.orders')}
                </Link>
              </li>
              <li>
                <Link to="/profile" className={COL_LINK}>
                  {t('nav.profile')}
                </Link>
              </li>
              <li>
                <Link to="/cart" className={COL_LINK}>
                  {t('cart.title')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div>
          <p className={COL_HEAD}>{t('footer.col.boutique')}</p>
          <address className="mt-6 space-y-4 text-sm not-italic text-white/65">
            <p className="flex gap-3">
              <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>
                {site.address.lines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </span>
            </p>
            <p className="flex items-center gap-3">
              <Icon name="clock" className="h-4 w-4 shrink-0 text-gold" />
              {t('footer.hours')}
            </p>
            {site.phones.map((p) => (
              <p key={p} className="flex items-center gap-3">
                <Icon name="phone" className="h-4 w-4 shrink-0 text-gold" />
                <a href={telHref(p)} className="transition-colors hover:text-gold">
                  {p}
                </a>
              </p>
            ))}
          </address>
        </div>
      </div>

      {/* Decorative wordmark band — the same device closes the presentation
          site's footer. Purely ornamental, so it is hidden from assistive tech. */}
      <div className="overflow-hidden border-t border-white/10" aria-hidden="true">
        <p className="heading-serif container-lux select-none whitespace-nowrap py-6 text-center text-[clamp(2.5rem,9vw,7rem)] uppercase leading-none tracking-[0.18em] text-white/[0.06]">
          Modern Monkey
        </p>
      </div>

      <div className="border-t border-white/10">
        <div className="container-lux micro flex flex-col items-center justify-between gap-4 py-6 tracking-[0.22em] text-white/40 md:flex-row">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
            <p>{t('footer.tagline')}</p>
            <Link to="/privacy" className="link-lux transition-colors hover:text-white">
              {t('footer.legal.privacy')}
            </Link>
            <LangSwitch />
          </div>
        </div>
      </div>
    </footer>
  );
}
