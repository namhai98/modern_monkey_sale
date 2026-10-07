import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { site, telHref } from '../lib/site';
import Icon from './Icon';
import IconButton from './IconButton';
import { INK_COL_HEAD, INK_COL_LINK } from './inkColumn';
import LangSwitch from './LangSwitch';

/* The presentation site's footer: a fixed-dark band in both themes, gold
   column headers, link-lux links at text-white/65, then the giant ghosted
   wordmark and the legal bar, each separated by a white/10 hairline.

   Four columns: the brand (blurb, social buttons) ·
   Help (about, FAQ, care, contact, legal) · Products · Contact (the boutique's
   phones, address and hours). */

const COL_HEAD = INK_COL_HEAD;
const COL_LINK = INK_COL_LINK;

function FooterLinks({ label, links }) {
  return (
    <nav aria-label={label}>
      <p className={COL_HEAD}>{label}</p>
      <ul className="mt-6 space-y-3.5">
        {links.map((l) => (
          <li key={l.to}>
            {l.to.startsWith('#') ? (
              <a href={l.to} className={`${COL_LINK} ${l.className || ''}`}>
                {l.label}
              </a>
            ) : (
              <Link to={l.to} className={`${COL_LINK} ${l.className || ''}`}>
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function SiteFooter({ flush = false }) {
  const { t } = useLocale();

  const help = [
    { to: '/story', label: t('footer.help.about') },
    { to: '/faq', label: t('footer.help.faq') },
    { to: '/product-care', label: t('footer.care.product') },
    { to: '#footer-contact', label: t('footer.care.contact') },
    { to: '/orders', label: t('nav.orders') },
    { to: '/privacy', label: t('footer.legal.privacy') },
  ];
  const products = [
    { to: '/shop?all=1', label: t('footer.products.all') },
    { to: '/shop?all=1&sort=created_at:desc', label: t('footer.products.new') },
    { to: '/shop?category=bags', label: t('nav.bags') },
    { to: '/shop?category=watches', label: t('nav.watches') },
    { to: '/shop?category=apparel', label: t('nav.apparel') },
    { to: '/shop?sale=1', label: t('nav.sale'), className: 'text-gold/80 hover:text-gold' },
  ];

  return (
    <footer className={`bg-ink text-white ${flush ? '' : 'mt-20 md:mt-32'}`}>
      <div className="container-lux grid grid-cols-2 gap-x-6 gap-y-12 py-14 md:gap-14 md:py-20 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        {/* Phones: brand and contact span the width, the two short link
            lists sit side by side between them. */}
        <div className="col-span-2 md:col-span-1">
          <p className="heading-serif text-xl uppercase tracking-label">
            Modern<span className="text-gold"> Monkey</span>
          </p>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/55">{t('footer.blurb')}</p>

          <div className="mt-8 flex gap-4">
            <IconButton
              as="a"
              tone="dark"
              href={site.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('float.facebook')}
            >
              <Icon name="facebook" className="h-4 w-4" />
            </IconButton>
            <IconButton
              as="a"
              tone="dark"
              href={site.social.messenger}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('float.messenger')}
            >
              <Icon name="messageCircle" className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <FooterLinks label={t('footer.col.help')} links={help} />
        <FooterLinks label={t('footer.col.products')} links={products} />

        <div id="footer-contact" className="col-span-2 scroll-mt-[calc(var(--header-h)+1.5rem)] md:col-span-1">
          <p className={COL_HEAD}>{t('footer.col.contact')}</p>
          <address className="mt-6 space-y-4 text-sm not-italic text-white/65">
            {site.phones.map((p) => (
              <p key={p} className="flex items-center gap-3">
                <Icon name="phone" className="h-4 w-4 shrink-0 text-gold" />
                <a href={telHref(p)} className="transition-colors hover:text-gold">
                  {p}
                </a>
              </p>
            ))}
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
          </address>
        </div>
      </div>

      {/* Decorative wordmark band — the same device closes the presentation
          site's footer. Purely ornamental, so it is hidden from assistive tech. */}
      <div className="overflow-hidden border-t border-white/10" aria-hidden="true">
        <p className="heading-serif container-lux select-none whitespace-nowrap py-6 text-center text-[clamp(2.5rem,9vw,7rem)] uppercase leading-none tracking-meta text-white/[0.06]">
          Modern Monkey
        </p>
      </div>

      <div className="border-t border-white/10">
        <div className="container-lux micro flex flex-col items-center justify-between gap-4 py-6 tracking-meta text-white/55 md:flex-row">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
            <Link to="/privacy" className="link-lux transition-colors hover:text-white">
              {t('footer.legal.privacy')}
            </Link>
            <LangSwitch tipSide="top" />
          </div>
        </div>
      </div>
    </footer>
  );
}
