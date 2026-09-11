import { useEffect, useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import { site, telHref } from '../lib/site';
import Icon from './Icon';
import IconButton from './IconButton';

/* The presentation site's floating contact column: Facebook, Messenger and a
   phone line as round gold-on-ink buttons pinned to the bottom-right corner,
   with a back-to-top button that appears once the page has scrolled 600px.
   Floating above the page is the one place this design allows a shadow, and
   IconButton's `floating` tone is exactly that treatment. */
export default function FloatingContact() {
  const { t } = useLocale();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // On a phone the column would sit over the product rows' right edge, so only
  // the call and back-to-top buttons stay; the social pair waits for md.
  const size = 'h-11 w-11 md:h-12 md:w-12';
  const phone = site.phones[0];

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-center gap-2.5 md:bottom-6 md:right-6 md:gap-3">
      {showTop && (
        <IconButton
          tone="floating"
          className={`pop-in ${size}`}
          aria-label={t('float.top')}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Icon name="arrowUp" className="h-5 w-5" />
        </IconButton>
      )}
      {/* display:contents at md lets the pair join the column without a wrapper box. */}
      <div className="hidden md:contents">
        <IconButton
          as="a"
          tone="floating"
          className={size}
          href={site.social.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('float.facebook')}
        >
          <Icon name="facebook" className="h-5 w-5" />
        </IconButton>
        <IconButton
          as="a"
          tone="floating"
          className={size}
          href={site.social.messenger}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('float.messenger')}
        >
          <Icon name="messageCircle" className="h-5 w-5" />
        </IconButton>
      </div>
      <IconButton
        as="a"
        tone="floating"
        className={size}
        href={telHref(phone)}
        aria-label={t('float.call', { phone })}
      >
        <Icon name="phone" className="h-5 w-5" />
      </IconButton>
    </div>
  );
}
