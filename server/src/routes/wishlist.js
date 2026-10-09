import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  addToWishlist,
  getWishlist,
  mergeWishlist,
  removeFromWishlist,
} from '../controllers/wishlistController.js';

const router = Router();

router.get('/', requireAuth, getWishlist);
router.post('/merge', requireAuth, mergeWishlist);
router.put('/:productId', requireAuth, addToWishlist);
router.delete('/:productId', requireAuth, removeFromWishlist);

export default router;
