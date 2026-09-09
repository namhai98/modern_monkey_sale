import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import client from '../api/client';

const CartContext = createContext(null);

// A cart line is identified by product + size variant, so M and L of the same
// piece are separate lines.
export const lineKey = (id, variantId) => `${id}:${variantId ?? ''}`;

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('mms_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mms_cart', JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  function addItem(product, quantity = 1, variant = null) {
    const variantId = variant?.id ?? null;
    const key = lineKey(product.id, variantId);
    setItems((prev) => {
      const existing = prev.find((i) => lineKey(i.id, i.variant_id) === key);
      if (existing) {
        return prev.map((i) =>
          lineKey(i.id, i.variant_id) === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          variant_id: variantId,
          variant_label: variant?.label ?? null,
          // capture the discounted price shown at add-time; the backend
          // re-validates it again at checkout (source of truth for orders).
          price: Number(product.final_price ?? product.price),
          original_price: Number(product.price),
          image_url: product.image_url || '',
          quantity,
        },
      ];
    });
  }

  function updateQuantity(key, quantity) {
    setItems((prev) =>
      prev.map((i) => (lineKey(i.id, i.variant_id) === key ? { ...i, quantity } : i))
    );
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((i) => lineKey(i.id, i.variant_id) !== key));
  }

  function clearCart() {
    setItems([]);
  }

  // Re-read live prices for the items in the cart (discounts can change / expire
  // after something was added). Returns how many lines changed. The backend
  // still recomputes everything at checkout — this only keeps the display honest.
  const syncPrices = useCallback(async () => {
    const ids = [...new Set(items.map((i) => i.id))];
    if (ids.length === 0) return 0;
    try {
      const { data } = await client.get('/products', {
        params: { ids: ids.join(','), limit: ids.length },
      });
      const byId = new Map(data.items.map((p) => [p.id, p]));
      let changed = 0;
      const next = items.map((it) => {
        const p = byId.get(it.id);
        if (!p) return it;
        const price = Number(p.final_price ?? p.price);
        const original_price = Number(p.price);
        if (price !== it.price || original_price !== it.original_price) changed += 1;
        return { ...it, price, original_price };
      });
      if (changed) setItems(next);
      return changed;
    } catch {
      return 0;
    }
  }, [items]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQuantity, removeItem, clearCart, syncPrices, total, lineKey }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
