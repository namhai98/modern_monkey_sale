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
      <div
        className="fixed z-[100] bottom-4 inset-x-0 flex flex-col items-center gap-2 px-4 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto w-full max-w-sm sm:w-auto text-left text-sm px-4 py-3 border shadow-[0_8px_24px_-8px_rgba(23,20,15,0.4)] animate-[fadeUp_0.25s_ease-out] ${
              t.type === 'error'
                ? 'bg-ink text-canvas border-ink'
                : 'bg-canvas text-ink border-line'
            }`}
          >
            {t.message}
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
