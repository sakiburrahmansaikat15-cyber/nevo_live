import { Socket } from 'socket.io';

export const registerRoomHandlers = (socket: Socket): void => {
  socket.on('room:join', ({ roomId, seatIndex }) => {
    socket.join(`room:${roomId}`);
    socket.to(`room:${roomId}`).emit('room:user-joined', {
      seatIndex,
      user: {
        userId: socket.data.user?.userId,
        nickname: socket.data.user?.nickname,
        avatar: socket.data.user?.avatar,
      },
    });
  });

  socket.on('room:leave', ({ roomId }) => {
    socket.leave(`room:${roomId}`);
    socket.to(`room:${roomId}`).emit('room:user-left', {
      userId: socket.data.user?.userId,
    });
  });

  socket.on('room:mic-toggle', ({ roomId, enabled }) => {
    socket.to(`room:${roomId}`).emit('room:mic-changed', {
      userId: socket.data.user?.userId,
      enabled,
    });
  });

  socket.on('room:chat', ({ roomId, message }) => {
    socket.to(`room:${roomId}`).emit('room:chat-message', {
      userId: socket.data.user?.userId,
      nickname: socket.data.user?.nickname,
      message,
    });
  });

  socket.on('room:message', ({ roomId, message }) => {
    socket.to(`room:${roomId}`).emit('room:message', {
      userId: socket.data.user?.userId,
      nickname: socket.data.user?.nickname,
      level: socket.data.user?.level,
      message,
    });
  });

  socket.on('room:gift', async ({ roomId, giftId, receiverId }) => {
    // In a full implementation, we'd fetch the Gift from DB to get the animation URL.
    // For now, we'll try to find it or mock it if missing, but ideally the client sends
    // enough info or we fetch it. Since the frontend expects `gift.animation` and `gift.name`,
    // let's fetch it from the DB.
    try {
      const Gift = require('../models').Gift;
      const gift = await Gift.findById(giftId);
      if (gift) {
         socket.to(`room:${roomId}`).emit('room:gift', {
           senderId: socket.data.user?.userId,
           senderName: socket.data.user?.nickname,
           receiverId,
           gift: {
             _id: gift._id,
             name: gift.name,
             icon: gift.icon,
             animation: gift.animation,
           },
         });
      }
    } catch (err) {
      console.error('room:gift error:', err);
    }
  });
};
