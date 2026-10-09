// Recently viewed pieces: a short list of product ids, newest first, kept in
// this browser only. Storage can be blocked (private mode, cleared site data),
// so every read and write is guarded and the feature simply goes quiet.

const KEY = 'mms_recent';
const MAX = 8;

function read() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(ids) ? ids.filter(Number.isInteger) : [];
  } catch {
    return [];
  }
}

export function recordView(id) {
  const n = Number(id);
  if (!Number.isInteger(n)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([n, ...read().filter((x) => x !== n)].slice(0, MAX)));
  } catch {
    /* storage unavailable — nothing to remember */
  }
}

export function getRecent(excludeId) {
  const skip = Number(excludeId);
  return read().filter((x) => x !== skip);
}
