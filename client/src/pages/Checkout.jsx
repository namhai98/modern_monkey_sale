import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { resizeUnsplash } from '../lib/media';

const field = 'w-full bg-transparent border-b border-line py-3 text-sm placeholder:text-stone focus:outline-none focus:border-ink transition-colors';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', line1: '', city: '', postcode: '', country: '' });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center text-stone">
        Your bag is empty.
      </div>
    );
  }

  async function placeOrder(e) {
    e.preventDefault();
    setPlacing(true);
    setError(null);
    const shipping_address = [
      form.name,
      form.line1,
      `${form.postcode} ${form.city}`.trim(),
      form.country,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await client.post('/orders', {
        items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        shipping_address,
      });
      clearCart();
      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.error || 'We could not place your order.');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 lg:grid lg:grid-cols-[1fr_400px] lg:gap-20">
      <div>
        <div className="flex items-center gap-3 eyebrow text-stone mb-10">
          <span>Bag</span><span>—</span><span className="text-ink">Details</span><span>—</span><span>Confirmation</span>
        </div>
        <h1 className="font-display text-4xl mb-2">Checkout</h1>
        <p className="text-sm text-stone mb-10">Signed in as {user?.email}</p>

        <form onSubmit={placeOrder} className="space-y-10">
          <div>
            <p className="eyebrow text-stone mb-4">Shipping address</p>
            <div className="space-y-5">
              <input className={field} placeholder="Full name" value={form.name}
                onChange={(e) => set('name', e.target.value)} required />
              <input className={field} placeholder="Address" value={form.line1}
                onChange={(e) => set('line1', e.target.value)} required />
              <div className="grid grid-cols-2 gap-5">
                <input className={field} placeholder="Postcode" value={form.postcode}
                  onChange={(e) => set('postcode', e.target.value)} required />
                <input className={field} placeholder="City" value={form.city}
                  onChange={(e) => set('city', e.target.value)} required />
              </div>
              <input className={field} placeholder="Country" value={form.country}
                onChange={(e) => set('country', e.target.value)} required />
            </div>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={placing}
            className="w-full h-12 bg-ink text-canvas eyebrow border border-ink hover:bg-canvas hover:text-ink transition-colors duration-500 disabled:opacity-40"
          >
            {placing ? 'Placing order…' : 'Place order'}
          </button>
          <p className="text-xs text-stone">
            Payment is not collected in this demo — a pending order is created for you to review.
          </p>
        </form>
      </div>

      <aside className="mt-16 lg:mt-0 border-t lg:border-t-0 lg:border-l border-line pt-10 lg:pt-0 lg:pl-14">
        <p className="eyebrow text-stone mb-6">Your order</p>
        <div className="space-y-5">
          {items.map((i) => (
            <div key={i.id} className="flex gap-4">
              <div className="h-20 w-16 bg-ivory shrink-0 overflow-hidden">
                {i.image_url && (
                  <img src={resizeUnsplash(i.image_url, 150)} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-display text-base">{i.name}</p>
                <p className="text-stone">Qty {i.quantity}</p>
              </div>
              <p className="text-sm text-stone">${(i.price * i.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="flex items-baseline justify-between border-t border-line mt-8 pt-6">
          <span className="eyebrow">Total</span>
          <span className="font-display text-2xl">${total.toFixed(2)}</span>
        </div>
        <p className="mt-6 text-xs text-stone">Secure checkout · Insured delivery · 14-day returns</p>
      </aside>
    </div>
  );
}
