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
import { listProviders, start, callback } from '../controllers/oauthController.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Tighter limit on the endpoints worth brute-forcing (per IP; the coarse
// /api/auth ceiling in index.js still applies on top)
const strict = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
// Social sign-in is two requests per attempt and shoppers retry after
// cancelling, so it gets its own slightly looser ceiling.
const oauth = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });

router.post('/register', register);
router.post('/login', strict, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutAll);
router.get('/me', requireAuth, me);
router.post('/forgot-password', strict, forgotPassword);
router.post('/reset-password', strict, resetPassword);

// Which social buttons the storefront should render.
router.get('/providers', listProviders);
router.get('/oauth/:provider', oauth, start);
router.get('/oauth/:provider/callback', oauth, callback);

export default router;
