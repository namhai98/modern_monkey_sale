import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import { site, telHref } from '../lib/site';
import Icon from './Icon';
import IconButton from './IconButton';

/* The presentation site's floating contact column: Facebook, Messenger and a
   phone line as round gold-on-ink buttons pinned to the bottom-right corner,
   with a back-to-top button that appears once the page has scrolled 600px.
   Floating above the page is the one place this design allows a shadow, and
   IconButton's `floating` tone is exactly that treatment.

   Below the desktop width a column of three sat over the product grid's right
   edge (and its heart buttons), so there the three fold into one contact
   button that opens them. `--float-lift` raises the whole stack while the
   product page's sticky buy bar is up. */
export default function FloatingContact() {
  const { t } = useLocale();
  const [showTop, setShowTop] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 600);
      setOpen(false);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const size = 'h-11 w-11 md:h-12 md:w-12';
  const phone = site.phones[0];
  const links = [
    { key: 'fb', href: site.social.facebook, icon: 'facebook', label: t('float.facebook'), external: true },
    { key: 'ms', href: site.social.messenger, icon: 'messageCircle', label: t('float.messenger'), external: true },
    { key: 'ph', href: telHref(phone), icon: 'phone', label: t('float.call', { phone }) },
  ];
  const linkButton = (l, extra = '') => (
    <IconButton
      key={l.key}
      as="a"
      tone="floating"
      className={`${size} ${extra}`}
      href={l.href}
      {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      aria-label={l.label}
    >
      <Icon name={l.icon} className="h-5 w-5" />
    </IconButton>
  );

  return (
    <div
      ref={ref}
      className="fixed bottom-[calc(1rem+var(--float-lift,0px))] right-4 z-40 flex flex-col items-center gap-2.5 transition-[bottom] duration-500 ease-[var(--ease-luxe)] md:bottom-[calc(1.5rem+var(--float-lift,0px))] md:right-6 md:gap-3"
    >
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

      {/* Desktop: the three, always out. */}
      <div className="hidden lg:contents">{links.map((l) => linkButton(l))}</div>

      {/* Phone and tablet: one button; the three open above it. */}
      <div className="contents lg:hidden">
        {open && links.map((l) => linkButton(l, 'pop-in'))}
        <IconButton
          tone="floating"
          className={size}
          aria-expanded={open}
          aria-label={open ? t('nav.close') : t('float.contact')}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'x' : 'messageCircle'} className="h-5 w-5" />
        </IconButton>
      </div>
    </div>
  );
}
