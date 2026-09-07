import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const canManage = requireRole('manager', 'admin');

router.get('/', listCategories);
router.post('/', requireAuth, canManage, createCategory);
router.patch('/:id', requireAuth, canManage, updateCategory);
router.delete('/:id', requireAuth, canManage, deleteCategory);

export default router;
