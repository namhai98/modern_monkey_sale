import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSkin } from '../context/SkinContext';
import Icon from './Icon';
import IconButton from './IconButton';
import { useLocale } from '../context/LocaleContext';
import { useFocusTrap } from '../lib/useFocusTrap';

const WIDTH = { sm: 'max-w-sm', md: 'max-w-xl', lg: 'max-w-3xl' };

/* A side panel that slides in from the edge — admin create/edit forms, the
   storefront size guide, the shop's filters on a phone. Portalled to <body>
   (the route wrapper is transformed, which would pin a fixed panel to it),
   focus kept inside, Escape and the scrim close it, the page behind does not
   scroll.

   side     'right' (default) or 'left'
   size     'sm' | 'md' (default) | 'lg'; `wide` is the older spelling of lg
   actions  extra controls in the header, before the close button */
export default function SidePanel({
  open, title, subtitle, onClose, children, footer, wide = false, side = 'right', size, actions,
}) {
  const { t } = useLocale();
  const ref = useFocusTrap(open);
  const width = WIDTH[size || (wide ? 'lg' : 'md')];
  const left = side === 'left';

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  // Hooks above any early return.
  const admin = useSkin() === 'admin';
  if (!open) return null;
  return createPortal(
    <div className={`fixed inset-0 z-panel ${admin ? 'admin-ui' : ''}`}>
      <div className="absolute inset-0 animate-[fadeIn_0.2s_ease-out] bg-ink/70 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute top-0 flex h-full w-full flex-col text-foreground outline-none ${admin ? 'bg-surface' : 'bg-background'} ${width} ${
          left
            ? 'left-0 border-r border-line animate-[drawerInLeft_0.35s_cubic-bezier(0.22,1,0.36,1)]'
            : 'right-0 border-l border-line animate-[drawerIn_0.35s_cubic-bezier(0.22,1,0.36,1)]'
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-6 py-5 md:px-8">
          <div className="min-w-0">
            <h2 className={admin ? 'truncate text-lg font-semibold' : 'heading-serif truncate text-xl'}>{title}</h2>
            {subtitle && (
              <p className={admin ? 'mt-1 text-sm text-muted' : 'micro mt-1.5 tracking-meta text-muted'}>{subtitle}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-4">
            {actions}
            {admin ? (
              <button
                type="button"
                onClick={onClose}
                aria-label={t('nav.close')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-admin-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            ) : (
              <IconButton tone="theme" size="sm" onClick={onClose} aria-label={t('nav.close')}>
                <Icon name="x" className="h-4 w-4" />
              </IconButton>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">{children}</div>
        {footer && <div className="shrink-0 border-t border-line bg-surface px-6 py-4 md:px-8">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
