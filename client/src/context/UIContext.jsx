import { createContext, useContext, useEffect, useState } from 'react';

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

  const value = {
    cartOpen,
    searchOpen,
    openCart: () => {
      setSearchOpen(false);
      setCartOpen(true);
    },
    closeCart: () => setCartOpen(false),
    openSearch: () => {
      setCartOpen(false);
      setSearchOpen(true);
    },
    closeSearch: () => setSearchOpen(false),
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within a UIProvider');
  return ctx;
}
