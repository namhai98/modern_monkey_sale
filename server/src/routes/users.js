import { Router } from 'express';
import {
  updateMe,
  changePassword,
  listUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
} from '../controllers/userController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Any signed-in user manages their own account
router.put('/me', requireAuth, updateMe);
router.put('/me/password', requireAuth, changePassword);

// Staff administration
router.get('/', requireAuth, requireRole('manager', 'admin'), listUsers);
router.post('/', requireAuth, requireRole('admin'), createUser);
router.patch('/:id/role', requireAuth, requireRole('admin'), updateUserRole);
router.patch('/:id/status', requireAuth, requireRole('admin'), updateUserStatus);

export default router;
