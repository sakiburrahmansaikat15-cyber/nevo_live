import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { verifyToken } from '../utils/jwt';
import { registerStreamHandlers } from './streamHandlers';
import { registerRoomHandlers } from './roomHandlers';
import { registerChatHandlers } from './chatHandlers';
import { registerCallHandlers } from './callHandlers';
import { registerMatchHandlers } from './matchHandlers';
import { registerTeenPattiHandlers, registerTeenPattiSocket } from './teenpattiHandlers';
import { registerRouletteHandlers, registerRouletteSocket } from './rouletteHandlers';
import { registerAviatorHandlers, registerAviatorSocket } from './aviatorHandlers';
import { streamService } from '../services/stream.service';

let io: Server;

const clintURLs: string[] = ["https://nevo-live.onrender.com", "https://nevo-live-app-user.onrender.com", "https://nevo-live-app-admin.onrender.com","https://nevo-live-app-agent.onrender.com", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004", "http://localhost:3005", "http://localhost:3006", "http://localhost:3007", "http://localhost:3008", "http://localhost:3009", "http://localhost:3010", "http://localhost:3011", "http://localhost:3012", "http://localhost:3013", "http://localhost:3014", "http://localhost:3015", "http://localhost:3016", "http://localhost:3017", "http://localhost:3018", "http://localhost:3019"];

export const initSocket = (httpServer: HTTPServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: clintURLs,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.data.user?.uid || 'anonymous'}`);

    // Join per-user room for notifications
    if (socket.data.user?.userId) {
      socket.join(`user:${socket.data.user.userId}`);
    }

    registerStreamHandlers(socket);
    registerRoomHandlers(socket);
    registerChatHandlers(socket);
    registerCallHandlers(socket);
    registerMatchHandlers(socket);
    registerTeenPattiSocket(socket);
    registerRouletteSocket(socket);
    registerAviatorSocket(socket);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.data.user?.uid || 'anonymous'}`);
      // Decrement the viewer count for any live stream this socket had joined,
      // so closing the tab/browser reflects immediately (idempotent per user).
      const userId = socket.data.user?.userId;
      for (const room of socket.rooms) {
        if (room.startsWith('stream:')) {
          const streamId = room.slice('stream:'.length);
          if (userId && streamId) streamService.leaveStream(streamId, userId).catch(() => {});
        }
      }
    });
  });

  registerTeenPattiHandlers(io);
  registerRouletteHandlers(io);
  registerAviatorHandlers(io);

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
