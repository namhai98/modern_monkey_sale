import { Router } from 'express';
import {
  register,
  login,
  me,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Tighter limit on the endpoints worth brute-forcing (per IP; the coarse
// /api/auth ceiling in index.js still applies on top)
const strict = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/register', register);
router.post('/login', strict, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutAll);
router.get('/me', requireAuth, me);
router.post('/forgot-password', strict, forgotPassword);
router.post('/reset-password', strict, resetPassword);

export default router;
