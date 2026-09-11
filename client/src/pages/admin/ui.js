/* Shared class vocabulary for the /admin screens.

   Each of these strings used to be re-declared at the top of six admin files,
   and they had drifted apart. They now live here so the admin reads as the same
   design system as the storefront: underline-only fields, square corners,
   hairline tables, micro-type column heads, gold for the active thing.

   The admin is dense on purpose — staff scan and edit rows here, so it keeps
   tighter spacing than the storefront's editorial rhythm. What it does not do
   is invent its own colours or type. */

// Underline-only field, the house input. Same treatment as the `field` utility
// in index.css; declared here as a string so the many admin inputs that need
// extra width/number classes can compose it.
export const inputCls =
  'w-full border-b border-line bg-transparent py-2.5 text-sm text-foreground ' +
  'placeholder:text-muted/60 transition-colors duration-300 ' +
  'focus:border-gold focus:outline-none disabled:opacity-50';

// Compact primary action. The storefront's <Button> is right for a CTA, but a
// row of them in a table toolbar needs less presence than px-9 py-4.
export const btnPrimary =
  'inline-flex items-center justify-center border border-gold bg-gold px-5 py-2 micro ' +
  'font-medium tracking-[0.2em] text-ink transition-colors duration-300 ' +
  'hover:bg-champagne hover:border-champagne disabled:opacity-50 disabled:pointer-events-none';

export const btnGhost =
  'inline-flex items-center justify-center border border-line px-5 py-2 micro tracking-[0.2em] ' +
  'text-foreground transition-colors duration-300 hover:border-gold hover:text-gold ' +
  'disabled:opacity-50 disabled:pointer-events-none';

// Destructive, and the only place the danger token appears.
export const btnDanger =
  'inline-flex items-center text-danger transition-opacity duration-300 hover:opacity-70 ' +
  'disabled:opacity-40 disabled:pointer-events-none';

export const errorCls = 'border-l-2 border-danger py-1 pl-4 text-sm text-danger';
export const okCls = 'border-l-2 border-gold py-1 pl-4 text-sm text-foreground';

// Hairline table: micro-type heads over a rule, hairline row rules, no fills
// and no zebra striping — same as the storefront's order table.
export const thCls = 'micro py-3 pr-4 text-left font-normal text-muted';
export const thNumCls = 'micro py-3 pl-4 text-right font-normal text-muted';
export const tdCls = 'py-3 pr-4 align-middle';
export const tdNumCls = 'py-3 pl-4 text-right align-middle tabular-nums';
export const trCls = 'border-b border-line';

/* Row state, expressed the way the storefront expresses status: gold when it is
   live, muted when it is not. No green/red pair. */
export const stateOn = 'text-gold';
export const stateOff = 'text-muted';
