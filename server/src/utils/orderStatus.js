export const ORDER_STATUSES = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

// Allowed forward moves from each status.
export const TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

// Entering one of these returns the order's items to stock.
export const RESTOCKING = new Set(['cancelled', 'refunded']);

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}
