import { Request, Response, NextFunction } from 'express';
import { Room } from '../models';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';

export const roomController = {
  async listRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const total = await Room.countDocuments({ isPrivate: false });
      const rooms = await Room.find({ isPrivate: false })
        .populate('ownerId', 'uid nickname avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      sendPaginated(res, rooms, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, seatCount = 8, isPrivate, password } = req.body;

      const seats = Array.from({ length: seatCount }, (_, i) => ({
        index: i,
        userId: null,
        isLocked: i === 0, // First seat is host seat
      }));
      seats[0].userId = req.user!.userId as any; // Host takes seat 0

      const room = await Room.create({
        ownerId: req.user!.userId,
        name,
        description,
        seats,
        isPrivate: isPrivate || false,
        password,
      });

      const populated = await room.populate('ownerId', 'uid nickname avatar');
      sendSuccess(res, populated, 'Room created', 201);
    } catch (error) {
      next(error);
    }
  },

  async getRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await Room.findById(req.params.id)
        .populate('ownerId', 'uid nickname avatar')
        .populate('seats.userId', 'uid nickname avatar');
      if (!room) {
        sendError(res, 'Room not found', 404);
        return;
      }
      sendSuccess(res, room);
    } catch (error) {
      next(error);
    }
  },

  async joinRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        sendError(res, 'Room not found', 404);
        return;
      }

      const seatIndex = req.body.seatIndex ?? -1;
      let seat = room.seats.find((s) => s.index === seatIndex);

      if (!seat) {
        // Find first empty seat
        seat = room.seats.find((s) => !s.userId && !s.isLocked);
      }

      if (!seat) {
        sendError(res, 'No available seats', 400);
        return;
      }

      seat.userId = req.user!.userId as any;
      await room.save();

      const populated = await room.populate('seats.userId', 'uid nickname avatar');
      sendSuccess(res, populated);
    } catch (error) {
      next(error);
    }
  },

  async leaveRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        sendError(res, 'Room not found', 404);
        return;
      }

      const seat = room.seats.find(
        (s) => s.userId?.toString() === req.user!.userId
      );

      if (seat) {
        seat.userId = undefined;
        await room.save();
      }

      sendSuccess(res, null, 'Left room');
    } catch (error) {
      next(error);
    }
  },

  async sit(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        sendError(res, 'Room not found', 404);
        return;
      }
      const index = parseInt(req.params.index, 10);
      const seat = room.seats.find((s) => s.index === index);
      if (!seat) {
        sendError(res, 'Seat not found', 404);
        return;
      }
      if (seat.isLocked) {
        sendError(res, 'Seat is locked', 400);
        return;
      }
      if (seat.userId) {
        sendError(res, 'Seat is already taken', 400);
        return;
      }
      // Remove user from any other seat in this room
      room.seats.forEach(s => {
        if (s.userId?.toString() === req.user!.userId) {
          s.userId = undefined;
        }
      });
      seat.userId = req.user!.userId as any;
      await room.save();

      const populated = await room.populate('seats.userId', 'uid nickname avatar');
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room._id}`).emit('room:seat:update', { roomId: room._id, seats: populated.seats });
      }

      sendSuccess(res, populated, 'Took seat');
    } catch (error) {
      next(error);
    }
  },

  async stand(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await Room.findById(req.params.id);
      if (!room) {
        sendError(res, 'Room not found', 404);
        return;
      }
      const index = parseInt(req.params.index, 10);
      const seat = room.seats.find((s) => s.index === index);
      if (!seat) {
        sendError(res, 'Seat not found', 404);
        return;
      }
      if (seat.userId?.toString() !== req.user!.userId && req.user!.userId !== room.ownerId.toString()) {
        sendError(res, 'Not authorized', 403);
        return;
      }
      seat.userId = undefined;
      await room.save();

      const populated = await room.populate('seats.userId', 'uid nickname avatar');

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room._id}`).emit('room:seat:update', { roomId: room._id, seats: populated.seats });
      }

      sendSuccess(res, populated, 'Left seat');
    } catch (error) {
      next(error);
    }
  },
};
