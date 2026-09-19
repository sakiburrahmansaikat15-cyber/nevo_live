import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User, PurchaseOrder, WithdrawalRequest, Transaction } from '../models';
import { paymentService } from '../services/payment.service';
import { agencyService } from '../services/agency.service';
import { auditService } from '../services/audit.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const agentController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = req.user!.userId;
      const [agent, pendingRecharges, pendingWithdrawals, agency, todayOrders] = await Promise.all([
        User.findById(agentId).select('uid nickname avatar diamonds coins level'),
        PurchaseOrder.countDocuments({ agentId, status: 'pending' }),
        WithdrawalRequest.countDocuments({ agentId, status: 'pending' }),
        agencyService.getByAgent(agentId),
        PurchaseOrder.countDocuments({
          agentId,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
      ]);
      sendSuccess(res, {
        agent,
        pendingRecharges,
        pendingWithdrawals,
        hostCount: agency?.hosts?.length || 0,
        todayOrders,
      });
    } catch (error) {
      next(error);
    }
  },

  // ─── Recharge requests (Host/User → Agent) ────────────────────────

  async getRechargeRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const { data, total } = await paymentService.getAgentRechargeRequests(req.user!.userId, status, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async approveRecharge(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await paymentService.approveRechargeRequest(req.params.id, req.user!.userId);
      await auditService.logAudit(req.user!.userId, 'recharge_approve', 'PurchaseOrder', req.params.id, { amountBdt: order.amountBdt }, req.ip);
      sendSuccess(res, order, 'Recharge approved');
    } catch (error) {
      next(error);
    }
  },

  async rejectRecharge(req: Request, res: Response, next: NextFunction) {
    try {
      const { note } = req.body;
      const order = await paymentService.rejectRechargeRequest(req.params.id, req.user!.userId, note);
      await auditService.logAudit(req.user!.userId, 'recharge_reject', 'PurchaseOrder', req.params.id, { note }, req.ip);
      sendSuccess(res, order, 'Recharge rejected');
    } catch (error) {
      next(error);
    }
  },

  // ─── Withdrawal requests ──────────────────────────────────────────

  async getWithdrawalRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const { data, total } = await paymentService.getAgentWithdrawalRequests(req.user!.userId, status, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async approveWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await paymentService.approveWithdrawalRequest(req.params.id, req.user!.userId);
      await auditService.logAudit(req.user!.userId, 'withdrawal_approve', 'WithdrawalRequest', req.params.id, { amount: request.amount, currency: request.currency }, req.ip);
      sendSuccess(res, request, 'Withdrawal approved');
    } catch (error) {
      next(error);
    }
  },

  async rejectWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const { note } = req.body;
      const request = await paymentService.rejectWithdrawalRequest(req.params.id, req.user!.userId, note);
      await auditService.logAudit(req.user!.userId, 'withdrawal_reject', 'WithdrawalRequest', req.params.id, { note }, req.ip);
      sendSuccess(res, request, 'Withdrawal rejected');
    } catch (error) {
      next(error);
    }
  },

  async markWithdrawalPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await paymentService.markWithdrawalPaid(req.params.id, req.user!.userId);
      await auditService.logAudit(req.user!.userId, 'withdrawal_paid', 'WithdrawalRequest', req.params.id, {}, req.ip);
      sendSuccess(res, request, 'Withdrawal marked as paid');
    } catch (error) {
      next(error);
    }
  },

  // ─── Buy from admin ───────────────────────────────────────────────

  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { currency, amountBdt, paymentMethod, screenshot, transactionId } = req.body;
      if (!currency || !amountBdt || !paymentMethod || !screenshot || !transactionId) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }
      const order = await paymentService.createAgentOrder(req.user!.userId, { currency, amountBdt, paymentMethod, screenshot, transactionId });
      sendSuccess(res, order, 'Purchase request created', 201);
    } catch (error) {
      next(error);
    }
  },

  async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await paymentService.getAgentPurchaseOrders(req.user!.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  // ─── Customers ────────────────────────────────────────────────────

  async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const agency = await agencyService.getByAgent(req.user!.userId);
      if (!agency) {
        sendSuccess(res, []);
        return;
      }
      const customers = await User.find({ _id: { $in: agency.hosts } })
        .select('uid nickname avatar phone level diamonds coins role')
        .sort({ createdAt: -1 });
      sendSuccess(res, customers);
    } catch (error) {
      next(error);
    }
  },

  // ─── Wallet / earnings ────────────────────────────────────────────

  async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const userIdObj = new mongoose.Types.ObjectId(userId);
      const [agent, rechargeTx, withdrawTx, agentPurchaseTx, commissionTx, transactions] = await Promise.all([
        User.findById(userId).select('diamonds coins uid nickname'),
        Transaction.aggregate([
          { $match: { userId: userIdObj, type: 'recharge', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { userId: userIdObj, type: { $in: ['withdraw', 'coin_sale'] }, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { userId: userIdObj, type: 'agent_recharge', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { userId: userIdObj, type: 'commission', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.find({ userId }).sort({ createdAt: -1 }).limit(50),
      ]);

      sendSuccess(res, {
        agent,
        earnings: {
          rechargeVolume: rechargeTx[0]?.total || 0,
          withdrawalVolume: withdrawTx[0]?.total || 0,
          purchaseVolume: agentPurchaseTx[0]?.total || 0,
          commissionEarned: commissionTx[0]?.total || 0,
        },
        transactions,
      });
    } catch (error) {
      next(error);
    }
  },

  // ─── Payment info (where users pay the agent) ─────────────────────

  async getPaymentInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId).select('paymentInfo');
      sendSuccess(res, user?.paymentInfo || { bybit: { qrCode: '', walletAddress: '' }, binance: { qrCode: '', walletAddress: '' } });
    } catch (error) {
      next(error);
    }
  },

  async updatePaymentInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { bybit, binance } = req.body;
      const update: any = {};
      if (bybit) {
        if (bybit.qrCode !== undefined) update['paymentInfo.bybit.qrCode'] = bybit.qrCode;
        if (bybit.walletAddress !== undefined) update['paymentInfo.bybit.walletAddress'] = bybit.walletAddress;
      }
      if (binance) {
        if (binance.qrCode !== undefined) update['paymentInfo.binance.qrCode'] = binance.qrCode;
        if (binance.walletAddress !== undefined) update['paymentInfo.binance.walletAddress'] = binance.walletAddress;
      }
      const user = await User.findByIdAndUpdate(req.user!.userId, { $set: update }, { new: true }).select('paymentInfo');
      sendSuccess(res, user?.paymentInfo, 'Payment info updated');
    } catch (error) {
      next(error);
    }
  },
};
