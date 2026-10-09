import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requireRole('staff', 'manager', 'admin'), getDashboard);

export default router;
