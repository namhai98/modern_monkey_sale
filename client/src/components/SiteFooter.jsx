import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function SiteFooter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  return (
    <footer className="bg-ink text-canvas mt-32">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="max-w-md">
          <p className="eyebrow text-canvas/60">The Maison Letter</p>
          <h3 className="font-display text-3xl mt-3 mb-6">
            Collections, before anyone else.
          </h3>
          {done ? (
            <p className="text-canvas/70 text-sm">Thank you — you’re on the list.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setDone(true);
              }}
              className="flex items-center gap-4 border-b border-canvas/30 pb-2"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 bg-transparent text-sm placeholder:text-canvas/40 focus:outline-none"
              />
              <button type="submit" className="eyebrow text-canvas/80 hover:text-canvas">
                Subscribe
              </button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 text-sm text-canvas/60">
          <div className="space-y-2">
            <p className="eyebrow text-canvas/40 mb-3">Shop</p>
            <Link to="/shop?category=bags" className="block hover:text-canvas">Bags</Link>
            <Link to="/shop?category=watches" className="block hover:text-canvas">Watches</Link>
            <Link to="/shop?category=apparel" className="block hover:text-canvas">Apparel</Link>
          </div>
          <div className="space-y-2">
            <p className="eyebrow text-canvas/40 mb-3">Client Care</p>
            <span className="block">Shipping &amp; Returns</span>
            <span className="block">Product Care</span>
            <span className="block">Contact</span>
          </div>
          <div className="space-y-2">
            <p className="eyebrow text-canvas/40 mb-3">The House</p>
            <span className="block">Our Story</span>
            <span className="block">Craftsmanship</span>
            <span className="block">Sustainability</span>
          </div>
          <div className="space-y-2">
            <p className="eyebrow text-canvas/40 mb-3">Account</p>
            <Link to="/orders" className="block hover:text-canvas">Orders</Link>
            <Link to="/profile" className="block hover:text-canvas">Profile</Link>
          </div>
        </div>

        <p className="mt-20 text-xs text-canvas/40">
          © {new Date().getFullYear()} Modern Monkey Maison. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
