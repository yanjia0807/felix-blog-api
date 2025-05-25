import { createAdapter } from "@socket.io/redis-adapter";
import { Core } from "@strapi/strapi";
import _ from "lodash";
import { Server, Socket } from "socket.io";
import { redis, initialize as initializeRedis } from "../redis";

export let io = null;

export const initialize = (strapi: Core.Strapi) => {
  const queryUser = async (userId: string) => {
    const user = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { id: userId },
      });

    return user;
  };

  const updateUserStatus = async (user: any, isOnline: boolean) => {
    await strapi.documents("plugin::users-permissions.user").update({
      documentId: user.documentId,
      data: {
        isOnline,
      },
    });
  };

  const noticeUserFollowers = async (user: any, isOnline: boolean) => {
    const result: any = await strapi
      .documents("plugin::users-permissions.user")
      .findOne({
        documentId: user.documentId,
        populate: {
          followers: {
            fields: [],
          },
        },
      });

    const followers = result.followers;

    followers.forEach((follower) => {
      io.to(follower.documentId).emit("userStatus", {
        data: {
          userId: user.documentId,
          isOnline,
        },
      });
    });
  };

  if (!io) {
    const config: any = strapi.config.get("socket");
    if (!redis) {
      initializeRedis(strapi);
    }
    const pubClient = redis;
    const subClient = pubClient.duplicate();

    io = new Server(strapi.server.httpServer, {
      adapter: createAdapter(pubClient, subClient),
      ...config,
    });

    io.use(async (socket: Socket, next) => {
      const token = socket.handshake.auth.token;

      try {
        if (token) {
          const jwtService = strapi.service("plugin::users-permissions.jwt");
          const payload = await jwtService.verify(token);
          const userId = payload.id;
          const user = await queryUser(userId);

          if (user) {
            const { id, documentId, username, email } = user;
            (socket as any).user = {
              id,
              documentId,
              username,
              email,
            };
          }
        }
        next();
      } catch (error) {
        strapi.log.error(`Socket auth failed: ${error.message}`);
        next();
      }
    });

    io.on("connection", (socket: Socket) => {
      strapi.log.info(
        `client disconnected: ${socket.id}, userId: ${(socket as any).userId}`
      );

      if ((socket as any).user) {
        socket.join((socket as any).user.documentId);
        updateUserStatus((socket as any).user, true);
        noticeUserFollowers((socket as any).user, true);
      }

      socket.on("disconnect", () => {
        strapi.log.info(
          `client disconnected: ${socket.id}, userId: ${(socket as any).userId}`
        );

        if ((socket as any).user) {
          updateUserStatus((socket as any).user, false);
          noticeUserFollowers((socket as any).user, false);
        }
      });
    });
  }
};

export const getIoUtils = (strapi: Core.Strapi) => {
  if (!io) {
    throw new Error("socket is not initialized");
  }

  const isUserOnline = async (documentId: string) => {
    const sockets = await io.sockets.adapter.sockets(new Set([documentId]));
    return sockets.size > 0;
  };

  return {
    isUserOnline,
  };
};
