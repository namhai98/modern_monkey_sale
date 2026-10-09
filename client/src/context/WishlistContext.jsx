import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);
const GUEST_KEY = 'mms_wishlist';

function readGuest() {
  try {
    const ids = JSON.parse(localStorage.getItem(GUEST_KEY));
    return Array.isArray(ids) ? ids.filter(Number.isInteger) : [];
  } catch {
    return [];
  }
}

/* Saved pieces (the heart).
   A guest's list lives in this browser. Once signed in, the account's list on
   the server is the only copy: the guest list is merged into it and cleared,
   so a piece removed on one device can't come back from another browser's
   leftover copy. Ids are newest first. */
export function WishlistProvider({ children }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [guestIds, setGuestIds] = useState(readGuest);
  const [accountIds, setAccountIds] = useState(null); // null until loaded

  useEffect(() => {
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(guestIds));
    } catch {
      // storage unavailable — the list just won't outlive the tab
    }
  }, [guestIds]);

  // Signed in (on boot or just now): fold any guest list in, then use the
  // account's list.
  useEffect(() => {
    if (loading) return undefined;
    if (!userId) {
      setAccountIds(null);
      return undefined;
    }
    let live = true;
    const pending = readGuest();
    const req = pending.length ? client.post('/wishlist/merge', { ids: pending }) : client.get('/wishlist');
    req
      .then((res) => {
        if (!live) return;
        setAccountIds(res.data.ids);
        if (pending.length) setGuestIds([]);
      })
      .catch(() => live && setAccountIds([]));
    return () => {
      live = false;
    };
  }, [userId, loading]);

  const ids = userId ? accountIds ?? [] : guestIds;

  const toggle = useCallback(
    (productId) => {
      const id = Number(productId);
      if (!userId) {
        setGuestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
        return;
      }
      // Optimistic: the heart fills at once; the server's answer settles it.
      const list = accountIds ?? [];
      const saving = !list.includes(id);
      setAccountIds(saving ? [id, ...list] : list.filter((x) => x !== id));
      const req = saving ? client.put(`/wishlist/${id}`) : client.delete(`/wishlist/${id}`);
      req
        .then((res) => setAccountIds(res.data.ids))
        .catch(() =>
          client
            .get('/wishlist')
            .then((res) => setAccountIds(res.data.ids))
            .catch(() => {})
        );
    },
    [userId, accountIds]
  );

  const value = useMemo(() => {
    const set = new Set(ids);
    return { ids, count: ids.length, has: (id) => set.has(Number(id)), toggle };
  }, [ids, toggle]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
