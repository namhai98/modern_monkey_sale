import { useId } from 'react';

/* Underline-only fields are the house input style — no box, no fill, no radius,
   focus turns the rule gold. The visual treatment lives in the `field` utility
   in index.css; this component adds the half the presentation site's contact
   form always pairs with it and that the storefront's five hand-rolled forms
   had each dropped: a real <label htmlFor>, plus a place for an error to go.

   Placeholder-only fields leave a shopper with no label once they start typing,
   which is exactly when a checkout form needs one most. */
export default function Field({
  label,
  id,
  error,
  hint,
  as = 'input',
  className = '',
  children,
  ...props
}) {
  const auto = useId();
  const fieldId = id || auto;
  const Tag = as;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="micro mb-1 block text-muted">
          {label}
        </label>
      )}
      <Tag
        id={fieldId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={`field ${error ? 'border-gold' : ''}`}
        {...props}
      >
        {children}
      </Tag>
      {error && (
        <p id={`${fieldId}-error`} className="mt-2 text-xs text-gold">
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

/* A form-level message. There is no semantic success/warning/danger palette in
   this design — status is gold text against a hairline, so an error is a gold
   rule and a tone of voice, not a red box. */
export function FormMessage({ children, tone = 'error' }) {
  if (!children) return null;
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`border-l-2 py-1 pl-4 text-sm ${
        tone === 'error' ? 'border-gold text-foreground' : 'border-line text-muted'
      }`}
    >
      {children}
    </p>
  );
}
