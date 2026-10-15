import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { SkinProvider } from './SkinContext';
import Button from '../components/Button';
import { useLocale } from './LocaleContext';
import { useFocusTrap } from '../lib/useFocusTrap';

const ConfirmContext = createContext(null);

/* The house confirmation, in place of the browser's confirm(): the question,
   what will happen, and two labelled buttons in the shopper's language.

   const confirm = useConfirm();
   if (!(await confirm({ title, body, confirmLabel, tone: 'danger' }))) return;

   Resolves true on confirm; false on cancel, Escape or a click on the scrim.
   Focus starts on Cancel — the safe choice — and returns to whatever opened
   the dialog. On a phone it sits at the foot of the screen, in thumb reach. */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null); // { title, body, confirmLabel, cancelLabel, tone, resolve }

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setRequest({ ...options, resolve });
      }),
    []
  );

  const close = useCallback((answer) => {
    setRequest((r) => {
      r?.resolve(answer);
      return null;
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);
  const admin = useLocation().pathname.startsWith('/admin');

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && (
        <SkinProvider value={admin ? 'admin' : 'house'}>
          <ConfirmDialog request={request} onClose={close} admin={admin} />
        </SkinProvider>
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ request, onClose, admin = false }) {
  const { t } = useLocale();
  const cancelRef = useRef(null);
  const ref = useFocusTrap(true, { initialFocus: cancelRef });
  const danger = request.tone === 'danger';

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className={`fixed inset-0 z-dialog flex items-end justify-center sm:items-center sm:p-6 ${admin ? 'admin-ui' : ''}`}>
      <div
        className="absolute inset-0 animate-[fadeIn_0.2s_ease-out] bg-ink/70 backdrop-blur-sm"
        onClick={() => onClose(false)}
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={request.body ? 'confirm-body' : undefined}
        className={`relative w-full max-w-md animate-[fadeUp_0.3s_cubic-bezier(0.22,1,0.36,1)] border border-line p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-foreground outline-none sm:p-8 ${
          admin ? 'rounded-t-lg bg-surface shadow-xl sm:rounded-lg' : 'bg-background'
        }`}
      >
        <h2 id="confirm-title" className={admin ? 'text-lg font-semibold leading-snug' : 'heading-serif text-xl leading-snug'}>
          {request.title}
        </h2>
        {request.body && (
          <p id="confirm-body" className="mt-3 text-sm leading-relaxed text-muted">
            {request.body}
          </p>
        )}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="outline-dark" size="sm" onClick={() => onClose(false)}>
            {request.cancelLabel || t('common.cancel')}
          </Button>
          <Button variant={danger ? 'danger' : 'gold'} size="sm" onClick={() => onClose(true)}>
            {request.confirmLabel || t('common.confirm')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}
