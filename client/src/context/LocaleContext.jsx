import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translate } from '../lib/i18n';
import client from '../api/client';

const LocaleContext = createContext(null);
// A deliberate new key. The old `mms_locale` was written on every mount, so it
// holds the previous default (usually 'en') for everyone who has been here
// before — a guess the site made, not a choice anyone made. Reading it would
// keep every returning visitor out of Mongolian, so it is left behind.
const STORAGE_KEY = 'mms_lang';
const RATE_KEY = 'mms_mnt_rate';

// Mongolian is the house language — everyone starts there, and English is a
// choice a visitor makes and we then remember.
const DEFAULT_LOCALE = 'mn';

function initialLocale() {
  try {
    const chosen = localStorage.getItem(STORAGE_KEY);
    if (chosen === 'en' || chosen === 'mn') return chosen;
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE;
}

// The last rate this browser saw. Prices render in tögrög on the first paint of
// a repeat visit instead of flashing dollars while /settings is in flight; the
// live value replaces it a moment later.
function cachedRate() {
  try {
    const rate = Number(localStorage.getItem(RATE_KEY));
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(initialLocale);
  // ₮ per $1. The API prefers a live exchange-rate feed and falls back to the
  // rate an admin entered; null means neither was available, and prices stay
  // in their stored currency rather than showing a wrong conversion.
  const [mntRate, setMntRate] = useState(cachedRate);
  const [rateStatus, setRateStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Only an explicit pick is remembered. Writing on mount is what turned the
  // old default into a stored "preference" nobody had expressed.
  const setLocale = useCallback((next) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    client
      .get('/settings')
      .then((res) => {
        if (cancelled) return;
        const rate = Number(res.data.mnt_rate);
        if (Number.isFinite(rate) && rate > 0) {
          setMntRate(rate);
          setRateStatus('ready');
          try {
            localStorage.setItem(RATE_KEY, String(rate));
          } catch {
            // ignore
          }
        } else {
          // The API answered but has no rate to give — keep whatever this
          // browser already had, and let prices fall back to USD if it had none.
          setRateStatus('error');
        }
      })
      .catch(() => {
        if (!cancelled) setRateStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, t, mntRate, rateStatus }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
