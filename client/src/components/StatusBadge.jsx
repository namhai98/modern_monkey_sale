import { useSkin } from '../context/SkinContext';

/* One status badge for the whole site — order states, product and user
   status in the admin, discount status. The design has one accent, so states
   are told apart by how much of it they carry, not by a palette of hues:

     complete   solid gold fill       done (an order delivered)
     active     gold rule + gold text live / in motion
     open       hairline + foreground waiting on someone
     closed     hairline + muted      over, nothing to do
     danger     oxblood rule + text   switched off by hand

   `dot` adds a small leading mark, for on/off states read down a column. */
const TONES = {
  complete: 'border-gold-fill bg-gold-fill text-ink',
  active: 'border-gold/50 text-gold',
  open: 'border-line text-foreground',
  closed: 'border-line text-muted',
  danger: 'border-danger/50 text-danger',
};
const DOTS = {
  complete: 'bg-ink',
  active: 'bg-gold',
  open: 'bg-foreground',
  closed: 'bg-muted',
  danger: 'bg-danger',
};

// The admin skin: Flowbite's soft, rounded badge — a tint of the tone rather
// than a rule — in the same five tones.
const ADMIN_TONES = {
  complete: 'bg-gold-fill text-ink',
  active: 'bg-gold-fill/15 text-gold',
  open: 'bg-admin-hover text-foreground',
  closed: 'bg-admin-hover text-muted',
  danger: 'bg-danger/15 text-danger',
};

export default function StatusBadge({ tone = 'closed', dot = false, children, className = '' }) {
  if (useSkin() === 'admin') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-0.5 text-xs font-medium ${
          ADMIN_TONES[tone] || ADMIN_TONES.closed
        } ${className}`}
      >
        {dot && <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOTS[tone] || DOTS.closed}`} />}
        {children}
      </span>
    );
  }
  return (
    <span
      className={`micro inline-flex items-center gap-1.5 whitespace-nowrap border px-2.5 py-1 tracking-meta ${
        TONES[tone] || TONES.closed
      } ${className}`}
    >
      {dot && <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOTS[tone] || DOTS.closed}`} />}
      {children}
    </span>
  );
}
