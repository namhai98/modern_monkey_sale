import { cloneElement, useId } from 'react';
import { useSkin } from '../context/SkinContext';

/* Underline-only fields are the house input style — no box, no fill, no radius,
   focus turns the rule gold. The visual treatment lives in the `field` utility
   in index.css; this component adds the half the presentation site's contact
   form always pairs with it and that the storefront's five hand-rolled forms
   had each dropped: a real <label htmlFor>, plus a place for an error to go.

   Placeholder-only fields leave a shopper with no label once they start typing,
   which is exactly when a checkout form needs one most.

   One field for the storefront and the admin (the admin's TextField and
   SelectField are thin wrappers). `required` adds a gold marker to the label;
   `control` swaps the input for another control (the custom Select), which
   gets the field's id. */
export default function Field({
  label,
  id,
  error,
  hint,
  as = 'input',
  className = '',
  required,
  control,
  children,
  ...props
}) {
  const auto = useId();
  // The admin draws Flowbite fields: a sentence-case label, a boxed input.
  const admin = useSkin() === 'admin';
  const fieldId = id || auto;
  const Tag = as;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={fieldId}
          className={admin ? 'mb-2 block text-sm font-medium text-foreground' : 'micro mb-1 block text-muted'}
        >
          {label}
          {required && <span aria-hidden="true" className="text-gold"> *</span>}
        </label>
      )}
      {control ? (
        cloneElement(control, {
          id: fieldId,
          invalid: Boolean(error),
          'aria-describedby': error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined,
        })
      ) : (
        <Tag
          id={fieldId}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={admin ? 'admin-field' : `field ${error ? 'border-danger' : ''}`}
          {...props}
        >
          {children}
        </Tag>
      )}
      {/* Errors use `danger` (a muted oxblood, theme-reactive), not gold: gold
          already means "active/selected" everywhere, and gold text on the
          light theme falls to ~2.4:1 contrast — too faint for a message the
          shopper has to read to finish the form. */}
      {error && (
        <p id={`${fieldId}-error`} className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${fieldId}-hint`} className="mt-2 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/* A form-level message: a hairline rule and a tone of voice, never a filled
   box. The text stays on `foreground` for legibility; only the rule carries
   the state — oxblood for an error, the plain line colour for information. */
export function FormMessage({ children, tone = 'error' }) {
  if (!children) return null;
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`border-l-2 py-1 pl-4 text-sm ${
        tone === 'error' ? 'border-danger text-foreground' : 'border-line text-muted'
      }`}
    >
      {children}
    </p>
  );
}
