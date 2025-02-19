import { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  initialize() {
    strapi.eventHub.on("socket.ready", async () => {
      const io = (strapi as any).io;
      if (!io) {
        strapi.log.error("Socket.IO is not initialized");
        return;
      }

      io.use(async (socket, next) => {
        const { token } = socket.handshake.auth;

        try {
          const jwtService = strapi.service("plugin::users-permissions.jwt");
          const payload = await jwtService.verify(token);
          socket.userId = payload.id;
        } catch (error) {
          return next(new Error("invalid token"));
        }
        next();
      });

      io.on("connection", async (socket: any) => {
        strapi.log.info(
          `New client connected with id ${socket.id}, userId: ${socket.userId}`
        );

        socket.emit("session", {
          userId: socket.userId,
        });

        socket.join(socket.userId);

        socket.on("disconnect", () => {
          strapi.log.info(`Client disconnected with id ${socket.id}`);
        });
      });

      strapi.log.info("Socket service initialized successfully");
    });
  },
});
