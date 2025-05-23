import { createAdapter } from "@socket.io/redis-adapter";
import { Core } from "@strapi/strapi";
import _ from "lodash";
import { Server, Socket } from "socket.io";
import { createRedisClient } from "../redis";

interface SocketManager {
  initialize: () => void;
  getIO: () => Server;
  isUserOnline: (userId: string) => Promise<boolean>;
  updateUserStatus: (userId: string, status: boolean) => void;
}

export const createSocketManager = (strapi: Core.Strapi): SocketManager => {
  let io: Server | null = null;

  const initialize = () => {
    const pubClient = createRedisClient(strapi);
    const subClient = pubClient.duplicate();

    io = new Server(strapi.server.httpServer, {
      adapter: createAdapter(pubClient, subClient),
      ...strapi.config.get("socket"),
    });

    setupMiddleware();
    setupEventHandlers();
  };

  const getIO = () => {
    if (!io) initialize();
    return io!;
  };

  const setupMiddleware = () => {
    io?.use(async (socket: Socket, next) => {
      const token = socket.handshake.auth.token;

      try {
        const jwtService = strapi.service("plugin::users-permissions.jwt");
        const payload = await jwtService.verify(token);
        (socket as any).userId = payload.id;
        next();
      } catch (error) {
        strapi.log.error(`Socket auth failed: ${error.message}`);
        next(new Error("Authentication failed"));
      }
    });
  };

  const setupEventHandlers = () => {
    io?.on("connection", (socket: Socket) => {
      const userId = (socket as any).userId;
      strapi.log.info(`client connected: ${socket.id} (user: ${userId})`);
      socket.join(userId);

      updateUserStatus(userId, true);

      socket.on("disconnect", () => {
        strapi.log.info(`client disconnected: ${socket.id}`);
        updateUserStatus(userId, false);
      });
    });
  };

  const isUserOnline = async (userId: string) => {
    const sockets = await getIO().sockets.adapter.sockets(
      new Set([userId])
    );
    return sockets.size > 0;
  };

  const updateUserStatus = (userId: string, isOnline: boolean) => {
    try {
      strapi.db.query("plugin::users-permissions.user").update({
        where: { id: userId },
        data: {
          isOnline,
        },
      });
    } catch (error) {
      strapi.log.error(`Update user status failed: ${error.message}`);
    }
  };

  return {
    initialize,
    getIO,
    isUserOnline,
    updateUserStatus,
  };
};
