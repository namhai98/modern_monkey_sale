import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { resizeUnsplash } from '../lib/media';

const ease = [0.22, 1, 0.36, 1];

export default function CartDrawer() {
  const { cartOpen, closeCart } = useUI();
  const { items, updateQuantity, removeItem, total } = useCart();
  const navigate = useNavigate();

  function go(path) {
    closeCart();
    navigate(path);
  }

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={closeCart}
          />
          <motion.aside
            className="absolute right-0 top-0 h-full w-full max-w-md bg-canvas flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease }}
            role="dialog"
            aria-label="Shopping bag"
          >
            <div className="flex items-center justify-between px-6 h-20 border-b border-line">
              <span className="eyebrow">Your Bag ({items.reduce((n, i) => n + i.quantity, 0)})</span>
              <button onClick={closeCart} aria-label="Close bag" className="text-stone hover:text-ink text-sm">
                Close
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-stone">Your bag is empty.</p>
                <button onClick={() => go('/shop')} className="eyebrow link-underline">
                  Continue shopping
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="h-24 w-20 bg-ivory shrink-0 overflow-hidden">
                        {item.image_url && (
                          <img
                            src={resizeUnsplash(item.image_url, 200)}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-lg leading-tight">{item.name}</p>
                        <p className="text-sm text-stone mt-1">${item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="inline-flex items-center border border-line">
                            <button
                              className="px-2.5 py-1 text-stone hover:text-ink"
                              onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="px-2 tabular-nums">{item.quantity}</span>
                            <button
                              className="px-2.5 py-1 text-stone hover:text-ink"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-stone hover:text-ink link-underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-line px-6 py-6 space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="eyebrow">Subtotal</span>
                    <span className="font-display text-xl">${total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-stone">Shipping and duties calculated at checkout.</p>
                  <button
                    onClick={() => go('/checkout')}
                    className="w-full bg-ink text-canvas h-12 eyebrow hover:bg-charcoal transition-colors"
                  >
                    Proceed to checkout
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
