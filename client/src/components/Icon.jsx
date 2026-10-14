import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  Funnel,
  Gem,
  Handbag,
  Heart,
  LayoutGrid,
  MapPin,
  Mars,
  Menu,
  MessageCircle,
  Minus,
  Moon,
  Pencil,
  Phone,
  Plus,
  Search,
  Shirt,
  ShoppingBag,
  Sun,
  Tag,
  Trash2,
  User,
  Users,
  Venus,
  VenusAndMars,
  Watch,
  X,
} from 'lucide-react';
import BrandMark, { isBrandMark } from './BrandMark';

// Every icon on the site is a lucide-react icon, looked up by a short name so
// call sites stay readable (<Icon name="search" />) and a swap happens here,
// once. The only exception is the pair of third-party brand logos on the
// sign-in buttons — see BrandMark.
//
// Icon-only buttons must still carry an aria-label at the call site, since
// there is no visible text.
const ICONS = {
  edit: Pencil,
  trash: Trash2,
  check: Check,
  heart: Heart,
  x: X,
  sun: Sun,
  moon: Moon,
  phone: Phone,
  mapPin: MapPin,
  clock: Clock,
  arrowUp: ArrowUp,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  chevronDown: ChevronDown,
  search: Search,
  user: User,
  bag: ShoppingBag,
  menu: Menu,
  filter: Funnel,
  plus: Plus,
  minus: Minus,
  messageCircle: MessageCircle,
  // The shop's category bar.
  grid: LayoutGrid,
  watch: Watch,
  handbag: Handbag,
  shirt: Shirt,
  gem: Gem,
  tag: Tag,
  // The shop's gender filter.
  users: Users,
  venus: Venus,
  mars: Mars,
  venusMars: VenusAndMars,
};

// `filled` paints the glyph solid — the saved state of the heart.
export default function Icon({ name, className = 'h-4 w-4', strokeWidth = 1.5, filled = false }) {
  if (isBrandMark(name)) return <BrandMark name={name} className={className} strokeWidth={strokeWidth} />;
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return (
    <Glyph
      className={className}
      /* 1.5 is the house stroke weight — lucide's default 2px reads heavy next
         to Montserrat at 500 and the hairline borders everything else uses. */
      strokeWidth={strokeWidth}
      fill={filled ? 'currentColor' : 'none'}
      aria-hidden="true"
      focusable="false"
    />
  );
}
