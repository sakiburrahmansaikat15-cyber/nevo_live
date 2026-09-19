import { Gift, User, Transaction, PlatformWallet } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';
import { notificationService } from './notification.service';

export const giftService = {
  async listActiveGifts() {
    return Gift.find({ isActive: true }).sort({ order: 1 });
  },

  async sendGift(senderId: string, receiverId: string, giftId: string, quantity: number = 1) {
    const gift = await Gift.findById(giftId);
    if (!gift || !gift.isActive) throw new AppError('Gift not found', 404);

    const sender = await User.findById(senderId);
    if (!sender) throw new AppError('Sender not found', 404);

    const receiver = await User.findById(receiverId);
    if (!receiver) throw new AppError('Receiver not found', 404);

    const totalCost = gift.priceDiamonds * quantity;
    if (sender.diamonds < totalCost) {
      throw new AppError('Insufficient diamonds', 400);
    }

    // Atomic deduction — prevents double-spend when two sends race
    const updatedSender = await User.findOneAndUpdate(
      { _id: senderId, diamonds: { $gte: totalCost } },
      { $inc: { diamonds: -totalCost } },
      { new: true }
    );
    if (!updatedSender) {
      throw new AppError('Insufficient diamonds', 400);
    }
    sender.diamonds = updatedSender.diamonds;

    // Add coins to receiver (user takes 70% of diamond value, platform takes 30%)
    const userCoins = Math.floor(totalCost * 0.7);
    const adminCoins = Math.floor(totalCost * 0.3);
    const updatedReceiver = await User.findOneAndUpdate(
      { _id: receiverId },
      { $inc: { coins: userCoins } },
      { new: true }
    );
    if (updatedReceiver) receiver.coins = updatedReceiver.coins;

    // Credit the platform's coin inventory with the admin share
    const platform = await PlatformWallet.getWallet();
    await PlatformWallet.updateOne({ _id: platform._id }, { $inc: { coins: adminCoins } });

    // Create transactions (send + receive + admin cut)
    await Transaction.create([
      {
        userId: senderId,
        type: 'gift_send',
        amount: totalCost,
        currency: 'diamond',
        targetId: receiverId,
        targetModel: 'User',
        giftId: gift._id,
        status: 'completed',
        description: `Sent ${quantity}x ${gift.name} to ${receiver.nickname}`,
      },
      {
        userId: receiverId,
        type: 'gift_receive',
        amount: userCoins,
        currency: 'coin',
        targetId: senderId,
        targetModel: 'User',
        giftId: gift._id,
        status: 'completed',
        description: `Received ${quantity}x ${gift.name} from ${sender.nickname}`,
      },
      {
        userId: platform.adminId,
        type: 'gift_cut',
        amount: adminCoins,
        currency: 'coin',
        targetId: senderId,
        targetModel: 'User',
        giftId: gift._id,
        status: 'completed',
        description: `Platform cut 30% from ${quantity}x ${gift.name} (${adminCoins} coins)`,
      },
    ]);

    // Push real-time balance updates to both parties (per-user socket rooms)
    try {
      getIO().to(`user:${receiverId}`).emit('balance:update', {
        coins: receiver.coins,
        diamonds: receiver.diamonds,
      });
      getIO().to(`user:${senderId}`).emit('balance:update', {
        coins: sender.coins,
        diamonds: sender.diamonds,
      });
    } catch {
      // Socket not initialized — balances already persisted
    }

    // Notify the receiver in real time (persisted + socket push to user room)
    try {
      await notificationService.createNotification(
        receiverId,
        'gift',
        'New Gift Received!',
        `${sender.nickname} sent you ${quantity}x ${gift.name}`,
        { giftId: gift._id, quantity, coinsEarned: userCoins }
      );
    } catch {
      // Notification failure must not block the gift
    }

    return {
      gift,
      quantity,
      totalCost,
      senderBalance: sender.diamonds,
      receiverEarned: userCoins,
    };
  },
};
