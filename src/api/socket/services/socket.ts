import { Core } from "@strapi/strapi";
import _ from "lodash";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  initialize() {
    strapi.eventHub.on("socket.ready", async () => {
      const io = (strapi as any).io;
      if (!io) {
        strapi.log.error("socket.io is not initialized");
        return;
      }

      io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;

        try {
          const jwtService = strapi.service("plugin::users-permissions.jwt");
          const payload = await jwtService.verify(token);
          socket.userId = payload.id;
          next();
        } catch (error) {
          next(new Error("invalid token"));
        }
      });

      io.on("connection", async (socket: any) => {
        strapi.log.info(`client [${socket.id}, ${socket.userId}] connected`);

        socket.join(socket.userId);
        socket.emit("session", {
          userId: socket.userId,
        });

        const onlineUser = await strapi
          .service("api::online-user.online-user")
          .createOnlineUser(socket);

        socket.on("disconnect", async () => {
          strapi.log.info(
            `client [${socket.id}, ${socket.userId}] disconnected`
          );

          await strapi
            .service("api::online-user.online-user")
            .removeOnlineUser(onlineUser.documentId, socket);
        });
      });
    });
  },
});
