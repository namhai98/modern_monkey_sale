import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', getSettings);
router.patch('/', requireAuth, requireRole('manager', 'admin'), updateSettings);

export default router;
