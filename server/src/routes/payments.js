import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { paymentMethods, qpayCallback, qpayStatus, startQpay } from '../controllers/paymentController.js';

const router = Router();

router.get('/methods', paymentMethods);
// Before '/qpay/:orderId', which would otherwise take "callback" as an order id.
router.get('/qpay/callback', qpayCallback);
router.post('/qpay/callback', qpayCallback);
router.post('/qpay/:orderId', requireAuth, startQpay);
router.get('/qpay/:orderId', requireAuth, qpayStatus);

export default router;
