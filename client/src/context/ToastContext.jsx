import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  // `action`: an optional { label, onClick } — e.g. Undo — shown beside the
  // message; using it also closes the toast.
  const push = useCallback(
    (message, type = 'info', ms = 3500, action = null) => {
      const id = (idRef.current += 1);
      // The same message twice at once (two syncs racing, a double click) is
      // one toast, not a stack of identical ones.
      setToasts((list) => (list.some((x) => x.message === message) ? list : [...list, { id, message, type, action }]));
      if (ms) setTimeout(() => dismiss(id), ms);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (m, ms) => push(m, 'success', ms),
      error: (m, ms) => push(m, 'error', ms ?? 5000),
      info: (m, ms) => push(m, 'info', ms),
      withAction: (m, action, ms = 6000) => push(m, 'info', ms, action),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* The presentation site's toast: an ink panel behind a gold hairline,
             centred at the foot of the page, fading up over 500ms. A toast is a
             floating layer, which is the one place a shadow is allowed. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(2rem+var(--float-lift,0px))] z-toast flex flex-col items-center gap-3 px-4"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm animate-[fadeUp_0.5s_cubic-bezier(0.22,1,0.36,1)] items-stretch border bg-ink text-sm text-white backdrop-blur sm:w-auto ${
              t.type === 'error' ? 'border-gold' : 'border-gold/40'
            }`}
          >
            <button type="button" onClick={() => dismiss(t.id)} className="flex-1 px-6 py-4 text-left">
              <span className="inline-flex items-center gap-3">
                <span aria-hidden="true" className="h-3 w-px shrink-0 bg-gold" />
                {t.message}
              </span>
            </button>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
                className="micro shrink-0 border-l border-white/15 px-5 tracking-button text-gold transition-colors hover:bg-white/5"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
