import { Router } from 'express';
import {
  listDiscounts,
  getDiscount,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} from '../controllers/discountController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const canManage = requireRole('manager', 'admin');

router.get('/', requireAuth, canManage, listDiscounts);
router.get('/:id', requireAuth, canManage, getDiscount);
router.post('/', requireAuth, canManage, createDiscount);
router.patch('/:id', requireAuth, canManage, updateDiscount);
router.delete('/:id', requireAuth, canManage, deleteDiscount);

export default router;
