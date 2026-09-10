import { Router } from 'express';
import {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from '../controllers/brandController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const canManage = requireRole('manager', 'admin');

router.get('/', listBrands);
router.post('/', requireAuth, canManage, createBrand);
router.patch('/:id', requireAuth, canManage, updateBrand);
router.delete('/:id', requireAuth, canManage, deleteBrand);

export default router;
