import { Router } from 'express';
import {
  listVariants,
  createVariant,
  updateVariant,
  deleteVariant,
} from '../controllers/productVariantController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

// Mounted at /api/products/:id/variants
const router = Router({ mergeParams: true });
const canManage = requireRole('manager', 'admin');

router.get('/', listVariants);
router.post('/', requireAuth, canManage, createVariant);
router.patch('/:variantId', requireAuth, canManage, updateVariant);
router.delete('/:variantId', requireAuth, canManage, deleteVariant);

export default router;
