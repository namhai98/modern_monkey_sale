import { useLocale } from '../context/LocaleContext';

/* This design has no semantic success/warning/danger palette — there is one
   accent, gold, and status is expressed with gold text against a hairline
   rather than a filled coloured pill. So instead of six hues, the six order
   states are told apart by how much of the accent each one carries:

     cancelled / refunded   hairline + muted      (closed, nothing to do)
     pending                hairline + foreground (live, not yet ours)
     paid / shipped         gold rule + gold text (in motion)
     delivered              solid gold            (complete)

   That keeps the single-accent rule and still leaves the states distinguishable
   at a glance down a column of orders. */
const STYLES = {
  pending: 'border-line text-foreground',
  paid: 'border-gold/50 text-gold',
  shipped: 'border-gold/50 text-gold',
  delivered: 'border-gold bg-gold text-ink',
  cancelled: 'border-line text-muted',
  refunded: 'border-line text-muted',
};

export default function OrderStatusBadge({ status }) {
  const { t } = useLocale();
  return (
    <span
      className={`micro inline-block border px-2.5 py-1 tracking-[0.22em] ${
        STYLES[status] || 'border-line text-muted'
      }`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
