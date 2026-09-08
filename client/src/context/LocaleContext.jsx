import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translate } from '../lib/i18n';
import client from '../api/client';

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
  // ₮ per $1, set by an admin — used to show MN prices in tögrög.
  const [mntRate, setMntRate] = useState(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore
    }
  }, [locale]);

  useEffect(() => {
    client
      .get('/settings')
      .then((res) => setMntRate(Number(res.data.mnt_rate) || null))
      .catch(() => {});
  }, []);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale: setLocaleState, t, mntRate }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
