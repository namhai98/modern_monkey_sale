import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info', ms = 3500) => {
      const id = (idRef.current += 1);
      setToasts((list) => [...list, { id, message, type }]);
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
        className="pointer-events-none fixed inset-x-0 bottom-8 z-[80] flex flex-col items-center gap-3 px-4"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto w-full max-w-sm animate-[fadeUp_0.5s_cubic-bezier(0.22,1,0.36,1)] border bg-ink px-6 py-4 text-left text-sm text-white shadow-2xl shadow-black/40 backdrop-blur sm:w-auto ${
              t.type === 'error' ? 'border-gold' : 'border-gold/40'
            }`}
          >
            <span className="inline-flex items-center gap-3">
              <span aria-hidden="true" className="h-3 w-px shrink-0 bg-gold" />
              {t.message}
            </span>
          </button>
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
