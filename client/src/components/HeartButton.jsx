import Icon from './Icon';
import Tooltip from './Tooltip';
import { useLocale } from '../context/LocaleContext';
import { useWishlist } from '../context/WishlistContext';

const LOOK = {
  // On a product photo: a small ink chip, legible over any image.
  overlay:
    'h-10 w-10 border border-white/15 bg-ink/60 backdrop-blur hover:border-gold/60',
  // Beside the add-to-bag button: the same square, hairline box as the stepper.
  outline: 'h-full min-h-14 w-14 border border-line hover:border-gold',
};

/* Save / unsave a piece. Gold and filled once saved; announced as a toggle
   (aria-pressed) with a label that says what a press will do. */
export default function HeartButton({ productId, variant = 'overlay', className = '', tooltipSide = 'top' }) {
  const { t } = useLocale();
  const { has, toggle } = useWishlist();
  const saved = has(productId);
  const label = saved ? t('wishlist.remove') : t('wishlist.add');

  return (
    <Tooltip label={label} side={tooltipSide} align="end">
      <button
        type="button"
        aria-pressed={saved}
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle(productId);
        }}
        className={`inline-flex items-center justify-center transition-colors duration-300 ${LOOK[variant]} ${
          saved ? 'text-gold' : variant === 'overlay' ? 'text-white hover:text-gold' : 'text-foreground hover:text-gold'
        } ${className}`}
      >
        <Icon name="heart" filled={saved} className="h-[1.05rem] w-[1.05rem]" />
      </button>
    </Tooltip>
  );
}
