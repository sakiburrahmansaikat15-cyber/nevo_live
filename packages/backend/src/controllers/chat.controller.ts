import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chat.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const chatController = {
  async getChats(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filter = req.query.filter === 'unread' || req.query.filter === 'seen' ? req.query.filter : undefined;
      const { data, total } = await chatService.getUserChats(req.user!.userId, page, limit, filter);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async markChatRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await chatService.markChatRead(req.params.chatId, req.user!.userId);
      sendSuccess(res, result, 'Marked as read');
    } catch (error) {
      next(error);
    }
  },

  async getOrCreateChat(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;
      const chat = await chatService.getOrCreateChat(req.user!.userId, userId);
      sendSuccess(res, chat, 'Chat ready');
    } catch (error) {
      next(error);
    }
  },

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const { data, total } = await chatService.getMessages(req.params.chatId, req.user!.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, kind, giftId, giftName, giftCount, voiceUrl, voiceDuration } = req.body;
      const msg = await chatService.sendMessage(req.params.chatId, req.user!.userId, message, {
        kind,
        giftId,
        giftName,
        giftCount,
        voiceUrl,
        voiceDuration,
      });
      sendSuccess(res, msg, 'Message sent', 201);
    } catch (error) {
      next(error);
    }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await chatService.getUnreadCount(req.user!.userId);
      sendSuccess(res, { count });
    } catch (error) {
      next(error);
    }
  },
};
