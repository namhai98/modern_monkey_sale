import StatusBadge from './StatusBadge';
import { useLocale } from '../context/LocaleContext';

/* An order's state as a StatusBadge: how far along it is decides how much
   gold it carries — pending waits on us (open), paid and shipped are moving
   (active), delivered is done (complete), cancelled and refunded are over
   (closed). */
const TONE = {
  pending: 'open',
  paid: 'active',
  shipped: 'active',
  delivered: 'complete',
  cancelled: 'closed',
  refunded: 'closed',
};

export default function OrderStatusBadge({ status }) {
  const { t } = useLocale();
  return <StatusBadge tone={TONE[status] || 'closed'}>{t(`status.${status}`)}</StatusBadge>;
}
