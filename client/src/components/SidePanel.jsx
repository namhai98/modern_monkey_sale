import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import IconButton from './IconButton';
import { useLocale } from '../context/LocaleContext';
import { useFocusTrap } from '../lib/useFocusTrap';

/* A side panel that slides in from the right — admin create/edit forms, the
   storefront size guide. Portalled to <body> (the route wrapper
   is transformed, which would pin a fixed panel to it), focus kept inside,
   Escape and the scrim close it, the page behind does not scroll. */
export default function SidePanel({ open, title, subtitle, onClose, children, footer, wide = false }) {
  const { t } = useLocale();
  const ref = useFocusTrap(open);

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

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 animate-[fadeIn_0.2s_ease-out] bg-ink/70 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-line bg-background text-foreground shadow-2xl outline-none ${
          wide ? 'max-w-3xl' : 'max-w-xl'
        } animate-[drawerIn_0.35s_cubic-bezier(0.22,1,0.36,1)]`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-6 py-5 md:px-8">
          <div className="min-w-0">
            <h2 className="heading-serif truncate text-xl">{title}</h2>
            {subtitle && <p className="micro mt-1.5 tracking-meta text-muted">{subtitle}</p>}
          </div>
          <IconButton tone="theme" size="sm" onClick={onClose} aria-label={t('nav.close')}>
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">{children}</div>
        {footer && <div className="shrink-0 border-t border-line bg-surface px-6 py-4 md:px-8">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
