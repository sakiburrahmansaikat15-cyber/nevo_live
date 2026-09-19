import { Router } from 'express';
import { paymentService } from '../services/payment.service';
import { authenticate } from '../middleware/auth';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';

const router = Router();

// Public — get enabled payment methods + rate
router.get('/methods', async (_req, res, next) => {
  try {
    const methods = await paymentService.getPaymentMethods();
    sendSuccess(res, methods);
  } catch (e) { next(e); }
});

// Public — get custom payment methods
router.get('/custom-methods', async (_req, res, next) => {
  try {
    const methods = await paymentService.getCustomPaymentMethods();
    sendSuccess(res, methods);
  } catch (e) { next(e); }
});

// Public — get agents with payment info (for recharge)
router.get('/agents', async (_req, res, next) => {
  try {
    const agents = await paymentService.getAgentsForRecharge();
    sendSuccess(res, agents);
  } catch (e) { next(e); }
});

// Public — get admin payment info (for agents to see where to pay)
router.get('/admin-info', async (_req, res, next) => {
  try {
    const info = await paymentService.getAdminPaymentInfo();
    sendSuccess(res, info);
  } catch (e) { next(e); }
});

// User — create a purchase order (buy diamonds/coins through an agent)
router.post('/orders', authenticate, async (req, res, next) => {
  try {
    const { paymentMethod, amountBdt, screenshot, transactionId, currency, agentId, accountNumber } = req.body;
    if (!paymentMethod || !amountBdt || !screenshot || !transactionId) {
      sendError(res, 'Missing required fields: paymentMethod, amountBdt, screenshot, transactionId', 400);
      return;
    }
    const order = await paymentService.createOrder(req.user!.userId, {
      paymentMethod, amountBdt, screenshot, transactionId,
      currency: currency || 'diamond', agentId, accountNumber,
    });
    sendSuccess(res, order, 'Order created', 201);
  } catch (e) { next(e); }
});

// User — get own purchase orders
router.get('/orders', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { data, total } = await paymentService.getUserOrders(req.user!.userId, page, limit);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

// User — get/set own payment info (Bybit + Binance QR + address)
router.get('/user-info', authenticate, async (req, res, next) => {
  try {
    const info = await paymentService.getUserPaymentInfo(req.user!.userId);
    sendSuccess(res, info);
  } catch (e) { next(e); }
});

router.put('/user-info', authenticate, async (req, res, next) => {
  try {
    const { bybit, binance } = req.body;
    const info = await paymentService.updateUserPaymentInfo(req.user!.userId, { bybit, binance });
    sendSuccess(res, info, 'Payment info updated');
  } catch (e) { next(e); }
});

// User — create withdrawal request (through linked agent)
router.post('/withdraw', authenticate, async (req, res, next) => {
  try {
    const { currency, amount, method, accountNumber } = req.body;
    if (!currency || !amount || !method || !accountNumber) {
      sendError(res, 'Missing required fields: currency, amount, method, accountNumber', 400);
      return;
    }
    const request = await paymentService.createWithdrawalRequest(req.user!.userId, { currency, amount, method, accountNumber });
    sendSuccess(res, request, 'Withdrawal request created', 201);
  } catch (e) { next(e); }
});

// User — get own withdrawal requests
router.get('/withdrawals', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { data, total } = await paymentService.getWithdrawalsForUser(req.user!.userId, page, limit);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

export default router;
