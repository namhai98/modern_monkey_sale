const STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-600',
  refunded: 'bg-red-100 text-red-700',
};

export default function OrderStatusBadge({ status }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${
        STYLES[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  );
}
