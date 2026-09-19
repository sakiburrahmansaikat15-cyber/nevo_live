import { Request, Response, NextFunction } from 'express';
import { Moment } from '../models';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';

export const momentController = {
  async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const total = await Moment.countDocuments();
      const moments = await Moment.find()
        .populate('userId', 'uid nickname avatar level sellerType verification')
        .populate('comments.userId', 'uid nickname avatar sellerType verification')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      sendPaginated(res, moments, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async createMoment(req: Request, res: Response, next: NextFunction) {
    try {
      const { content, media } = req.body;
      const moment = await Moment.create({
        userId: req.user!.userId,
        content,
        media: media || [],
      });
      const populated = await moment.populate('userId', 'uid nickname avatar level sellerType verification');
      sendSuccess(res, populated, 'Moment created', 201);
    } catch (error) {
      next(error);
    }
  },

  async getMoment(req: Request, res: Response, next: NextFunction) {
    try {
      const moment = await Moment.findById(req.params.id)
        .populate('userId', 'uid nickname avatar level sellerType verification')
        .populate('comments.userId', 'uid nickname avatar sellerType verification');
      if (!moment) {
        sendError(res, 'Moment not found', 404);
        return;
      }
      sendSuccess(res, moment);
    } catch (error) {
      next(error);
    }
  },

  async deleteMoment(req: Request, res: Response, next: NextFunction) {
    try {
      const moment = await Moment.findOneAndDelete({
        _id: req.params.id,
        userId: req.user!.userId,
      });
      if (!moment) {
        sendError(res, 'Moment not found or unauthorized', 404);
        return;
      }
      sendSuccess(res, null, 'Moment deleted');
    } catch (error) {
      next(error);
    }
  },

  async toggleLike(req: Request, res: Response, next: NextFunction) {
    try {
      const moment = await Moment.findById(req.params.id);
      if (!moment) {
        sendError(res, 'Moment not found', 404);
        return;
      }

      const userId = req.user!.userId;
      const index = moment.likes.indexOf(userId as any);

      if (index > -1) {
        moment.likes.splice(index, 1);
        await moment.save();
        sendSuccess(res, { liked: false });
      } else {
        moment.likes.push(userId as any);
        await moment.save();
        sendSuccess(res, { liked: true });
      }
    } catch (error) {
      next(error);
    }
  },

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const moment = await Moment.findById(req.params.id);
      if (!moment) {
        sendError(res, 'Moment not found', 404);
        return;
      }

      moment.comments.push({
        userId: req.user!.userId as any,
        text: req.body.text,
        createdAt: new Date(),
      });

      await moment.save();

      const populated = await moment.populate('comments.userId', 'uid nickname avatar sellerType verification');
      sendSuccess(res, populated.comments[populated.comments.length - 1], 'Comment added');
    } catch (error) {
      next(error);
    }
  },
};
