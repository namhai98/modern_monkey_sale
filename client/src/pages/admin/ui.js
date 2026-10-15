/* Shared class vocabulary for the /admin screens.

   Each of these strings used to be re-declared at the top of six admin files,
   and they had drifted apart. They now live here so the admin reads as the same
   design system as the storefront: underline-only fields, square corners,
   hairline tables, micro-type column heads, gold for the active thing.

   The admin is dense on purpose — staff scan and edit rows here, so it keeps
   tighter spacing than the storefront's editorial rhythm. What it does not do
   is invent its own colours or type. */

// Underline-only field, the house input: the `field` utility in index.css, the
// same one the storefront's <Field> uses. A string so the few hand-placed admin
// inputs (inline rename, the rate input) can add width classes to it.
export const inputCls = 'admin-field';

// Buttons are the shared <Button> (components/Button.jsx), size="xs" in the
// admin's toolbars and forms, variant="danger" for irreversible actions.

export const errorCls = 'border-l-2 border-danger py-1 pl-4 text-sm text-danger';
export const okCls = 'border-l-2 border-gold py-1 pl-4 text-sm text-foreground';

// Hairline table: micro-type heads over a rule, hairline row rules, no fills
// and no zebra striping — same as the storefront's order table.
// Both sides padded: a right-aligned number next to a left-aligned column
// would otherwise run straight into it.
export const thCls = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted';
export const thNumCls = 'px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted';
export const tdCls = 'px-4 py-3 align-middle';
export const tdNumCls = 'px-4 py-3 text-right align-middle tabular-nums';
export const trCls = 'border-b border-line last:border-b-0';

/* Row state, expressed the way the storefront expresses status: gold when it is
   live, muted when it is not. No green/red pair. */
export const stateOn = 'text-gold';
export const stateOff = 'text-muted';
