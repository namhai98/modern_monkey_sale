import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import SiteFooter from './SiteFooter';
import CartDrawer from './CartDrawer';
import SearchOverlay from './SearchOverlay';

// Admin screens keep their own plain chrome — no marketing footer there.
const HIDE_FOOTER = ['/admin', '/login', '/forgot-password', '/reset-password', '/checkout'];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const hideFooter = HIDE_FOOTER.some((p) => pathname.startsWith(p));

  return (
    <>
      <Navbar />
      <main className={isHome ? '' : 'pt-16 md:pt-20 min-h-[60vh]'}>{children}</main>
      {!hideFooter && <SiteFooter />}
      <CartDrawer />
      <SearchOverlay />
    </>
  );
}
