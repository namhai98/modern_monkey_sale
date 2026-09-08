import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { LocaleProvider } from './context/LocaleContext';
import ProtectedRoute from './components/ProtectedRoute';
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
import AdminUsers from './pages/admin/Users';
import AdminProducts from './pages/admin/Products';
import AdminCategories from './pages/admin/Categories';
import AdminDiscounts from './pages/admin/Discounts';
import AdminSettings from './pages/admin/Settings';
import AdminOrders from './pages/admin/Orders';
import AdminOrderDetail from './pages/admin/OrderDetail';

const STAFF = ['staff', 'manager', 'admin'];
const MANAGER = ['manager', 'admin'];

export default function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
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
                <Route path="/admin/orders" element={<ProtectedRoute roles={STAFF}><AdminOrders /></ProtectedRoute>} />
                <Route path="/admin/orders/:id" element={<ProtectedRoute roles={STAFF}><AdminOrderDetail /></ProtectedRoute>} />
                <Route path="/admin/products" element={<ProtectedRoute roles={MANAGER}><AdminProducts /></ProtectedRoute>} />
                <Route path="/admin/categories" element={<ProtectedRoute roles={MANAGER}><AdminCategories /></ProtectedRoute>} />
                <Route path="/admin/discounts" element={<ProtectedRoute roles={MANAGER}><AdminDiscounts /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute roles={MANAGER}><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute roles={MANAGER}><AdminSettings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </UIProvider>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
