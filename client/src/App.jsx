import { lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { LocaleProvider } from './context/LocaleContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import Layout from './components/Layout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Profile from './pages/Profile';
import Forbidden from './pages/Forbidden';
import NotFound from './pages/NotFound';

// Admin bundles are behind auth and rarely hit by shoppers — load on demand.
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminBrands = lazy(() => import('./pages/admin/Brands'));
const AdminDiscounts = lazy(() => import('./pages/admin/Discounts'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminOrderDetail = lazy(() => import('./pages/admin/OrderDetail'));

const STAFF = ['staff', 'manager', 'admin'];
const MANAGER = ['manager', 'admin'];

export default function App() {
  return (
    <ThemeProvider>
    <LocaleProvider>
      <AuthProvider>
        <CartProvider>
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
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/forbidden" element={<Forbidden />} />
                  <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                  <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  {/* AdminNav stays mounted across every /admin/* navigation — only
                      the Outlet content below it swaps while a page's chunk loads. */}
                  <Route path="/admin" element={<AdminLayout />}>
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
        </CartProvider>
      </AuthProvider>
    </LocaleProvider>
    </ThemeProvider>
  );
}
