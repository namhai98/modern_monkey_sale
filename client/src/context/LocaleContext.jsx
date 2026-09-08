import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translate } from '../lib/i18n';

const LocaleContext = createContext(null);
const STORAGE_KEY = 'mms_locale';

function initialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'mn') return saved;
  } catch {
    // ignore
  }
  const nav = (navigator.language || '').toLowerCase();
  return nav.startsWith('mn') ? 'mn' : 'en';
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore
    }
  }, [locale]);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale: setLocaleState, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
