import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  adjustStock,
  listStockMovements,
} from '../controllers/productController.js';
import productImageRoutes from './productImages.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';

const router = Router();
const canManage = requireRole('manager', 'admin');

// Public catalog (staff also get inactive products via ?include_inactive=1)
router.get('/', optionalAuth, listProducts);
router.post('/', requireAuth, canManage, createProduct);

// Image sub-resource: upload / reorder / primary / delete
router.use('/:id/images', productImageRoutes);

router.get('/:id', optionalAuth, getProduct);
router.get('/:id/movements', requireAuth, canManage, listStockMovements);
router.patch('/:id', requireAuth, canManage, updateProduct);
router.patch('/:id/stock', requireAuth, canManage, adjustStock);

export default router;
