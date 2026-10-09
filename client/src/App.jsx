import { lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { LocaleProvider } from './context/LocaleContext';
import { ToastProvider } from './context/ToastContext';
import { WishlistProvider } from './context/WishlistContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import Layout from './components/Layout';
// The pages a shopper lands on stay in the main bundle so they paint at once.
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Forbidden from './pages/Forbidden';
import NotFound from './pages/NotFound';

// Everything reached after a click — bag, checkout, account, sign-in, the
// legal and care pages — loads on demand. Layout holds the Suspense boundary.
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Privacy = lazy(() => import('./pages/Privacy'));
const ProductCare = lazy(() => import('./pages/ProductCare'));
const Story = lazy(() => import('./pages/Story'));
const Faq = lazy(() => import('./pages/Faq'));
const Saved = lazy(() => import('./pages/Saved'));

// Admin bundles are behind auth and rarely hit by shoppers — load on demand.
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminBrands = lazy(() => import('./pages/admin/Brands'));
const AdminDiscounts = lazy(() => import('./pages/admin/Discounts'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminOrderDetail = lazy(() => import('./pages/admin/OrderDetail'));

const STAFF = ['staff', 'manager', 'admin'];
const MANAGER = ['manager', 'admin'];

export default function App() {
  return (
    <ThemeProvider>
    <LocaleProvider>
      <AuthProvider>
        <CartProvider>
        <WishlistProvider>
          <BrowserRouter>
            <ToastProvider>
              <UIProvider>
                <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/product-care" element={<ProductCare />} />
                  <Route path="/story" element={<Story />} />
                  <Route path="/faq" element={<Faq />} />
                  <Route path="/saved" element={<Saved />} />
                  <Route path="/forbidden" element={<Forbidden />} />
                  <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                  <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  {/* AdminNav stays mounted across every /admin/* navigation — only
                      the Outlet content below it swaps while a page's chunk loads. */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<ProtectedRoute roles={STAFF}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="orders" element={<ProtectedRoute roles={STAFF}><AdminOrders /></ProtectedRoute>} />
                    <Route path="orders/:id" element={<ProtectedRoute roles={STAFF}><AdminOrderDetail /></ProtectedRoute>} />
                    <Route path="products" element={<ProtectedRoute roles={MANAGER}><AdminProducts /></ProtectedRoute>} />
                    <Route path="categories" element={<ProtectedRoute roles={MANAGER}><AdminCategories /></ProtectedRoute>} />
                    <Route path="brands" element={<ProtectedRoute roles={MANAGER}><AdminBrands /></ProtectedRoute>} />
                    <Route path="discounts" element={<ProtectedRoute roles={MANAGER}><AdminDiscounts /></ProtectedRoute>} />
                    <Route path="users" element={<ProtectedRoute roles={MANAGER}><AdminUsers /></ProtectedRoute>} />
                    <Route path="settings" element={<ProtectedRoute roles={MANAGER}><AdminSettings /></ProtectedRoute>} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </UIProvider>
            </ToastProvider>
          </BrowserRouter>
        </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </LocaleProvider>
    </ThemeProvider>
  );
}
