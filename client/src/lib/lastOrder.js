// The order this tab just placed. Checkout empties the bag as it hands over to
// the order page, so a shopper who presses Back lands on an empty bag; this is
// how checkout and the bag know where to send them instead.
// Per tab (sessionStorage) and short-lived — it answers "did I just order?",
// not "what did I order last week".

const KEY = 'mms_last_order';
const FRESH_FOR_MS = 30 * 60 * 1000;

export function rememberOrder(id) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() }));
  } catch {
    // storage blocked: Back simply shows the empty bag
  }
}

/** The id of an order placed in this tab in the last half hour, or null. */
export function recentOrder() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return saved && Date.now() - saved.at < FRESH_FOR_MS ? saved.id : null;
  } catch {
    return null;
  }
}
