// The listing as the shopper left it — the cards loaded so far and the scroll
// position — so Back from a product returns to the same card instead of the
// first 15 at the top. One entry, this tab only (sessionStorage), kept for 10
// minutes so prices and stock are never more than that stale. Storage can be
// unavailable; then Back simply loads the list afresh.

const KEY = 'mms_shop_list';
const TTL = 10 * 60 * 1000;

export function readListMemory(search, key) {
  try {
    const m = JSON.parse(sessionStorage.getItem(KEY));
    if (m && m.key === key && m.search === search && Date.now() - m.at < TTL && Array.isArray(m.products)) return m;
  } catch {
    /* unavailable or malformed — start fresh */
  }
  return null;
}

export function writeListMemory(memory) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...memory, at: Date.now() }));
  } catch {
    /* quota or blocked storage — Back just reloads the list */
  }
}
