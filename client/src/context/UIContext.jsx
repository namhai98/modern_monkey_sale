import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Lock body scroll whenever an overlay is open
  useEffect(() => {
    const open = cartOpen || searchOpen;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [cartOpen, searchOpen]);

  // Escape closes whatever is open
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setCartOpen(false);
        setSearchOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Stable callbacks + a memoised value: this context sits above the whole
  // app, so a new object every render re-rendered every consumer (and
  // re-subscribed the effects that list these callbacks as dependencies).
  const openCart = useCallback(() => {
    setSearchOpen(false);
    setCartOpen(true);
  }, []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openSearch = useCallback(() => {
    setCartOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const value = useMemo(
    () => ({ cartOpen, searchOpen, openCart, closeCart, openSearch, closeSearch }),
    [cartOpen, searchOpen, openCart, closeCart, openSearch, closeSearch]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within a UIProvider');
  return ctx;
}
