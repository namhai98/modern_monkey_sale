import { Router } from 'express';
import {
  createOrder,
  listMyOrders,
  listAllOrders,
  exportOrdersCsv,
  getOrder,
  updateOrderStatus,
  cancelMyOrder,
} from '../controllers/orderController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const canStaff = requireRole('staff', 'manager', 'admin');

router.post('/', requireAuth, createOrder);
router.get('/mine', requireAuth, listMyOrders);
router.get('/', requireAuth, canStaff, listAllOrders);
// Before '/:id', which would otherwise take "export" as an order id.
router.get('/export', requireAuth, canStaff, exportOrdersCsv);
router.get('/:id', requireAuth, getOrder);
router.patch('/:id/status', requireAuth, canStaff, updateOrderStatus);
router.post('/:id/cancel', requireAuth, cancelMyOrder);

export default router;
