import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  adjustStock,
  listStockMovements,
  uploadProductImage,
} from '../controllers/productController.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { uploadImage, handleUploadErrors } from '../middleware/upload.js';

const router = Router();
const canManage = requireRole('manager', 'admin');

// Public catalog (staff also get inactive products via ?include_inactive=1)
router.get('/', optionalAuth, listProducts);

// Literal path before /:id so "upload" is not read as an id
router.post('/upload', requireAuth, canManage, uploadImage, handleUploadErrors, uploadProductImage);

router.get('/:id', optionalAuth, getProduct);
router.get('/:id/movements', requireAuth, canManage, listStockMovements);
router.post('/', requireAuth, canManage, createProduct);
router.patch('/:id', requireAuth, canManage, updateProduct);
router.patch('/:id/stock', requireAuth, canManage, adjustStock);

export default router;
