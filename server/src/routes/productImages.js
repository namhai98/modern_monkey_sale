import { Router } from 'express';
import {
  uploadImage,
  deleteImage,
  reorderImages,
  setPrimaryImage,
} from '../controllers/productImageController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadSingleImage, handleUploadErrors } from '../middleware/upload.js';

// Mounted at /api/products/:id/images
const router = Router({ mergeParams: true });
const canManage = requireRole('manager', 'admin');

router.post('/', requireAuth, canManage, uploadSingleImage, handleUploadErrors, uploadImage);
router.patch('/reorder', requireAuth, canManage, reorderImages);
router.patch('/:imageId/primary', requireAuth, canManage, setPrimaryImage);
router.delete('/:imageId', requireAuth, canManage, deleteImage);

export default router;
