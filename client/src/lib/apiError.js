// Turn a failed API call into a sentence in the shopper's own language.
//
// The server answers with English text plus a stable `code`. Showing that text
// as-is put English sentences on a Mongolian page, so known codes (and the two
// validation messages a shopper can actually trigger) map to dictionary keys
// here. Anything unmapped falls back to the page's own generic message — or,
// in English, to the server's text, which is already English and specific.
const CODE_KEYS = {
  INVALID_CREDENTIALS: 'error.invalidCredentials',
  ACCOUNT_DISABLED: 'error.accountDisabled',
  EMAIL_TAKEN: 'error.emailTaken',
  RATE_LIMITED: 'error.rateLimited',
  INSUFFICIENT_STOCK: 'error.insufficientStock',
};

// VALIDATION_ERROR covers dozens of messages, most of them admin-only; these
// are the ones a storefront form can produce.
const MESSAGE_KEYS = [
  [/at least 8 characters/i, 'error.passwordShort'],
  [/invalid email/i, 'error.invalidEmail'],
];

/**
 * @param err          the caught axios error
 * @param t            the locale's translate function
 * @param locale       'mn' | 'en'
 * @param fallbackKey  the page's own generic failure message
 * @param overrides    { CODE: key } — a code that means something more
 *                     specific on this page (e.g. INVALID_CREDENTIALS on the
 *                     change-password form is "current password is wrong")
 */
export function apiErrorMessage(err, { t, locale, fallbackKey, overrides = {} }) {
  if (!err?.response) return t('error.network');

  const data = err.response.data || {};
  const key = overrides[data.code] || CODE_KEYS[data.code];
  if (key) return t(key);

  const msg = typeof data.error === 'string' ? data.error : '';
  const match = MESSAGE_KEYS.find(([re]) => re.test(msg));
  if (match) return t(match[1]);

  if (locale === 'en' && msg) return msg;
  return t(fallbackKey);
}
