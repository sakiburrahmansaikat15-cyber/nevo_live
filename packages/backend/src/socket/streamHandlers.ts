import { Socket } from 'socket.io';
import { getIO } from '.';
import { User, Transaction } from '../models';
import { streamService } from '../services/stream.service';

/** Diamond cost of a highlighted (SMS) message in the live chat. */
const HIGHLIGHT_COST = 100;

/** Max length of a live chat message (prevent abuse). */
const MAX_MESSAGE_LENGTH = 500;

/**
 * The JWT carries no profile fields (only userId/uid/role), so display
 * identity must be resolved from the DB — otherwise nickname/avatar are
 * undefined and every receiving client crashes on render.
 */
const getUserProfile = async (userId?: string) => {
  if (!userId) return { userId: undefined as string | undefined, nickname: 'Guest', avatar: '' };
  const u = await User.findById(userId).select('nickname avatar').lean();
  return { userId, nickname: u?.nickname || 'Guest', avatar: u?.avatar || '' };
};

export const registerStreamHandlers = (socket: Socket): void => {
  socket.on('stream:join', async ({ streamId }) => {
    const { userId, nickname, avatar } = await getUserProfile(socket.data.user?.userId);
    socket.join(`stream:${streamId}`);
    socket.to(`stream:${streamId}`).emit('stream:viewer-joined', {
      userId,
      nickname,
      avatar,
    });
  });

  socket.on('stream:leave', ({ streamId }) => {
    socket.leave(`stream:${streamId}`);
    // Idempotent per-viewer decrement so closing/leaving is reflected in the count.
    const userId = socket.data.user?.userId;
    if (userId) streamService.leaveStream(streamId, userId).catch(() => {});
    socket.to(`stream:${streamId}`).emit('stream:viewer-left', {
      userId,
    });
  });

  // Host ends the stream from the room — flips status server-side (authoritative).
  socket.on('stream:ended', async ({ streamId }, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId || !streamId) return;
      await streamService.endStream(streamId, userId);
      if (typeof ack === 'function') ack?.({ success: true });
    } catch {
      if (typeof ack === 'function') ack?.({ success: false });
    }
  });

  socket.on('stream:chat', async ({ streamId, message }) => {
    const { userId, nickname, avatar } = await getUserProfile(socket.data.user?.userId);
    // Emit to the whole room (including sender) so everyone, including the
    // sender, sees the message immediately.
    getIO().to(`stream:${streamId}`).emit('stream:chat-received', {
      userId,
      nickname,
      avatar,
      message: String(message ?? '').trim().slice(0, MAX_MESSAGE_LENGTH),
    });
  });

  socket.on('stream:gift', async ({ streamId, gift, count }) => {
    const { userId, nickname, avatar } = await getUserProfile(socket.data.user?.userId);
    // Emit to the whole room (including sender) so the sender sees their own
    // gift message + burst, and the host sees the gift.
    getIO().to(`stream:${streamId}`).emit('stream:gift-received', {
      userId,
      nickname,
      avatar,
      gift,
      count,
    });
  });

  socket.on('stream:highlight', async ({ streamId, message }, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return ack?.({ success: false, error: 'Not authenticated' });
      if (!message || !String(message).trim()) return ack?.({ success: false, error: 'Message is required' });

      // Atomic diamond deduction — prevents double-spend on rapid taps
      const updated = await User.findOneAndUpdate(
        { _id: userId, diamonds: { $gte: HIGHLIGHT_COST } },
        { $inc: { diamonds: -HIGHLIGHT_COST } },
        { new: true }
      );
      if (!updated) return ack?.({ success: false, error: 'Insufficient diamonds' });

      // Ledger entry (audit trail)
      await Transaction.create({
        userId,
        type: 'highlight',
        amount: HIGHLIGHT_COST,
        currency: 'diamond',
        targetId: streamId,
        targetModel: 'User',
        status: 'completed',
        description: `Highlighted message in live stream`,
      }).catch(() => {});

      // Real-time balance sync to the sender's other devices
      try {
        getIO().to(`user:${userId}`).emit('balance:update', {
          diamonds: updated.diamonds,
        });
      } catch {
        // socket not initialized
      }

      const { nickname, avatar } = await getUserProfile(userId);

      // Broadcast the highlight to the whole room
      getIO().to(`stream:${streamId}`).emit('stream:highlight-received', {
        userId,
        nickname,
        avatar,
        message: String(message).trim().slice(0, MAX_MESSAGE_LENGTH),
      });

      ack?.({ success: true, senderBalance: updated.diamonds });
    } catch (err: any) {
      ack?.({ success: false, error: err?.message || 'Failed to highlight message' });
    }
  });

  socket.on('stream:like', ({ streamId }) => {
    // Real-time reaction count — broadcast to the whole room so the host sees
    // every viewer's like (and the sender sees their own).
    getIO().to(`stream:${streamId}`).emit('stream:like-received', {
      userId: socket.data.user?.userId,
    });
  });
};
