import { useLocale } from '../context/LocaleContext';

const STYLES = {
  pending: 'border-amber-800/60 text-amber-400',
  paid: 'border-blue-800/60 text-blue-400',
  shipped: 'border-indigo-800/60 text-indigo-400',
  delivered: 'border-green-800/60 text-green-400',
  cancelled: 'border-line text-stone',
  refunded: 'border-red-800/60 text-red-400',
};

export default function OrderStatusBadge({ status }) {
  const { t } = useLocale();
  return (
    <span
      className={`inline-block border px-2 py-0.5 text-xs font-medium tracking-wide ${
        STYLES[status] || 'border-line text-stone'
      }`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
