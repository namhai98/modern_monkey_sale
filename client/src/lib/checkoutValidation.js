// Checkout's delivery fields: what each must look like, and the message key a
// shopper sees when it doesn't. Kept apart from the page so the rules read as
// one list.
import { CITIES, districtsOf, isCapital, khoroosOf } from './mnRegions';

// Letters in any script (Cyrillic names are the norm here), plus the marks
// names really carry.
const LETTERS = /\p{L}/gu;
const NAME_CHARS = /^[\p{L}\p{M}\s.'’-]+$/u;

export const LIMITS = {
  name: 80,
  phone: 8,
  khoroo: 40,
  detail: 300,
  label: 40,
};

// A Mongolian number: exactly eight digits, nothing else.
export const onlyDigits = (raw, max = LIMITS.phone) => String(raw || '').replace(/\D/g, '').slice(0, max);
export const isValidPhone = (v) => /^\d{8}$/.test(String(v || ''));

const letterCount = (s) => (s.match(LETTERS) || []).length;

const RULES = {
  name: (v) => (letterCount(v) < 2 || !NAME_CHARS.test(v) ? 'checkout.err.name' : null),
  phone: (v) => (isValidPhone(v) ? null : 'checkout.err.phone'),
  city: (v) => (CITIES.includes(v) ? null : 'checkout.err.required'),
  district: (v, form) => (districtsOf(form.city).includes(v) ? null : 'checkout.err.required'),
  // The capital's khoroo comes from a list; an aimag's bag is typed.
  khoroo: (v, form) =>
    isCapital(form.city)
      ? (khoroosOf(form.city, form.district) || []).includes(v)
        ? null
        : 'checkout.err.required'
      : null,
  detail: (v) => (v.length < 5 ? 'checkout.err.detail' : null),
};

// Which fields must be filled; `label` (Home, Office…) may stay blank.
const OPTIONAL = new Set(['label']);
export const FIELDS = [...Object.keys(RULES), 'label'];

/** The message key for one field, or null when it is fine. */
export function fieldError(name, form) {
  const v = String(form[name] ?? '').trim();
  if (!v) return OPTIONAL.has(name) ? null : 'checkout.err.required';
  if (LIMITS[name] && v.length > LIMITS[name]) return 'checkout.err.tooLong';
  return RULES[name] ? RULES[name](v, form) : null;
}

/** Every field's message key, keyed by field; empty when the form is good. */
export function validateCheckout(form) {
  const errors = {};
  for (const name of FIELDS) {
    const e = fieldError(name, form);
    if (e) errors[name] = e;
  }
  return errors;
}
