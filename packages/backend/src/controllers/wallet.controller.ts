import { Request, Response, NextFunction } from 'express';
import { walletService } from '../services/wallet.service';
import { sendSuccess } from '../utils/response';

export const walletController = {
  async getWallet(_req: Request, res: Response, next: NextFunction) {
    try {
      const wallet = await walletService.getWallet();
      const history = await walletService.getWalletHistory();
      sendSuccess(res, { wallet, history });
    } catch (error) {
      next(error);
    }
  },

  async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId, currency, amount } = req.body;
      if (!agentId || !currency || !amount) {
        res.status(400).json({ success: false, error: 'agentId, currency, and amount are required' });
        return;
      }
      const result = await walletService.transferToAgent(
        req.user!.userId,
        agentId,
        currency as 'diamond' | 'coin',
        Number(amount),
        req.ip
      );
      sendSuccess(res, result, 'Transfer completed');
    } catch (error) {
      next(error);
    }
  },
};
