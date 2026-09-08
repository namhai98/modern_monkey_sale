import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';
import { resizeUnsplash } from '../lib/media';
import { money } from '../lib/price';
import Button from '../components/Button';
import ImageFallback from '../components/ImageFallback';

export default function Cart() {
  const { items, updateQuantity, removeItem, total } = useCart();
  const { t } = useLocale();
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="font-display text-4xl mb-12">{t('cart.title')}</h1>

      {items.length === 0 ? (
        <p className="text-stone">
          {t('cart.empty')}{' '}
          <Link to="/shop" className="link-underline text-ink">{t('cart.continue')}</Link>.
        </p>
      ) : (
        <>
          <div className="divide-y divide-line border-y border-line">
            {items.map((item) => (
              <div key={item.id} className="flex gap-6 py-6">
                <div className="h-32 w-24 bg-ivory shrink-0 overflow-hidden">
                  <ImageFallback
                    src={resizeUnsplash(item.image_url, 200)}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-display text-xl">{item.name}</p>
                    <p className="text-stone">{money(item.price * item.quantity)}</p>
                  </div>
                  <p className="text-sm text-stone mt-1">
                    {item.original_price > item.price && (
                      <s className="text-stone/50 mr-2">{money(item.original_price)}</s>
                    )}
                    {t('cart.each', { price: money(item.price) })}
                  </p>
                  <div className="flex items-center gap-5 mt-4 text-sm">
                    <span className="inline-flex items-center border border-line">
                      <button className="px-3 py-1 text-stone hover:text-ink"
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>−</button>
                      <span className="px-2 tabular-nums">{item.quantity}</span>
                      <button className="px-3 py-1 text-stone hover:text-ink"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    </span>
                    <button onClick={() => removeItem(item.id)} className="text-stone hover:text-ink link-underline">
                      {t('cart.remove')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-baseline justify-between mt-8">
            <span className="eyebrow">{t('cart.subtotal')}</span>
            <span className="font-display text-2xl">{money(total)}</span>
          </div>
          <Button full size="lg" className="mt-8" onClick={() => navigate('/checkout')}>
            {t('cart.checkout')}
          </Button>
        </>
      )}
    </div>
  );
}
