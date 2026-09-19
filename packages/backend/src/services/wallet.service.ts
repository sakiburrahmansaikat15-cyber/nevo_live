import { PlatformWallet, User, Transaction } from '../models';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { auditService } from './audit.service';

export const walletService = {
  async getWallet() {
    return PlatformWallet.getWallet();
  },

  async transferToAgent(adminId: string, agentId: string, currency: 'diamond' | 'coin', amount: number, ip?: string) {
    if (!amount || amount <= 0) throw new AppError('Amount must be positive', 400);

    const wallet = await PlatformWallet.getWallet();
    const field = currency === 'diamond' ? 'diamonds' : 'coins';

    if (wallet[field] < amount) {
      throw new AppError(`Insufficient ${currency} inventory`, 400);
    }

    const agent = await User.findById(agentId);
    if (!agent) throw new AppError('Agent not found', 404);
    if (agent.role !== 'agent') throw new AppError('Target user is not an agent', 400);

    // Decrement platform inventory
    wallet[field] -= amount;
    await wallet.save();

    // Credit agent balance
    if (currency === 'diamond') agent.diamonds += amount;
    else agent.coins += amount;
    await agent.save();

    // Transaction record
    await Transaction.create({
      userId: agentId,
      type: 'transfer',
      amount,
      currency,
      status: 'completed',
      description: `Transfer from admin wallet (${currency})`,
    });

    await auditService.logAudit(adminId, 'wallet_transfer', 'User', agentId, { currency, amount }, ip);
    await notificationService.createNotification(
      agentId,
      'recharge',
      'Wallet credited',
      `${amount} ${currency} transferred to your wallet by admin`,
      { currency, amount }
    );

    return { wallet: wallet.toObject(), agentBalance: { diamonds: agent.diamonds, coins: agent.coins } };
  },

  async getWalletHistory() {
    return Transaction.find({ type: 'transfer' })
      .populate('userId', 'uid nickname role')
      .sort({ createdAt: -1 })
      .limit(100);
  },
};
