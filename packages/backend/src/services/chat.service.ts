import { Chat, ChatMessage, User } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';

export const chatService = {
  async getOrCreateChat(userId: string, otherUserId: string) {
    if (userId === otherUserId) throw new AppError('Cannot chat with yourself', 400);

    const other = await User.findById(otherUserId);
    if (!other) throw new AppError('User not found', 404);

    // Sorted participant pair for deterministic lookup
    const pair = [userId, otherUserId].sort();

    let chat = await Chat.findOne({
      participants: { $all: pair },
    }).populate('participants', 'uid nickname avatar level sellerType verification');

    if (!chat) {
      chat = await Chat.create({ participants: pair });
      chat = await Chat.populate(chat, { path: 'participants', select: 'uid nickname avatar level sellerType verification' });
    }

    return chat;
  },

  async getUserChats(userId: string, page: number, limit: number, readFilter?: 'unread' | 'seen') {
    const total = await Chat.countDocuments({ participants: userId });
    let chats = await Chat.find({ participants: userId })
      .populate('participants', 'uid nickname avatar level sellerType verification')
      .populate('lastMessageBy', 'uid nickname')
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Add unread count + other participant per chat
    let result = await Promise.all(
      chats.map(async (chat) => {
        const unread = await ChatMessage.countDocuments({
          chatId: chat._id,
          senderId: { $ne: userId },
          read: false,
        });
        const other = (chat.participants as any[]).find((p: any) => p._id.toString() !== userId);
        return { ...chat.toObject(), unread, other };
      })
    );

    // Unread/Seen tabs
    if (readFilter === 'unread') result = result.filter((c) => c.unread > 0);
    else if (readFilter === 'seen') result = result.filter((c) => c.unread === 0);

    return { data: result, total };
  },

  /** Mark all incoming messages in a chat as read (read receipts). */
  async markChatRead(chatId: string, userId: string) {
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) throw new AppError('Chat not found', 404);

    const result = await ChatMessage.updateMany(
      { chatId, senderId: { $ne: userId }, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    // Push a live "read" signal to the sender so their Seen badge updates in real time
    const senderIds = await ChatMessage.distinct('senderId', { chatId, senderId: { $ne: userId } });
    const io = (await import('../socket')).getIO();
    for (const senderId of senderIds) {
      try {
        io.to(`user:${senderId.toString()}`).emit('chat:read', { chatId, byUserId: userId });
      } catch {
        // socket not ready
      }
    }

    return { modified: result.modifiedCount };
  },

  async getMessages(chatId: string, userId: string, page: number, limit: number) {
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) throw new AppError('Chat not found', 404);

    // Mark incoming messages as read (with readAt for receipts)
    await ChatMessage.updateMany(
      { chatId, senderId: { $ne: userId }, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    const total = await ChatMessage.countDocuments({ chatId });
    const messages = await ChatMessage.find({ chatId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { data: messages.reverse(), total };
  },

  async sendMessage(chatId: string, senderId: string, message: string, extras: { kind?: 'text' | 'gift' | 'voice'; giftId?: string; giftName?: string; giftCount?: number; voiceUrl?: string; voiceDuration?: number } = {}) {
    if (!message || !message.trim()) throw new AppError('Message is required', 400);
    const text = message.trim().slice(0, 2000);

    const chat = await Chat.findOne({ _id: chatId, participants: senderId });
    if (!chat) throw new AppError('Chat not found', 404);

    const msg = await ChatMessage.create({
      chatId,
      senderId,
      message: text,
      kind: extras.kind || 'text',
      giftId: extras.giftId,
      giftName: extras.giftName,
      giftCount: extras.giftCount,
      voiceUrl: extras.voiceUrl,
      voiceDuration: extras.voiceDuration,
    });

    chat.lastMessage = extras.kind === 'gift' ? `Sent ${extras.giftCount || ''} ${extras.giftName || 'a gift'}` : extras.kind === 'voice' ? 'Voice message' : text;
    chat.lastMessageAt = new Date();
    chat.lastMessageBy = senderId as any;
    await chat.save();

    // Real-time delivery to the other participant
    const recipientId = (chat.participants as any[])
      .find((p: any) => p.toString() !== senderId);
    if (recipientId) {
      try {
        getIO().to(`user:${recipientId.toString()}`).emit('chat:message', {
          chatId,
          message: msg.toObject(),
          senderId,
        });
      } catch {
        // socket not initialized
      }
    }

    return msg;
  },

  async getUnreadCount(userId: string) {
    const chats = await Chat.find({ participants: userId }).select('_id');
    const ids = chats.map((c) => c._id);
    if (ids.length === 0) return 0;

    return ChatMessage.countDocuments({
      chatId: { $in: ids },
      senderId: { $ne: userId },
      read: false,
    });
  },
};
