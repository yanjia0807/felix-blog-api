import type { Core } from "@strapi/strapi";
import { Server as SocketServer } from "socket.io";

interface SocketConfig {
  cors: {
    origin: string | string[];
    methods: string[];
  };
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    const socketConfig = strapi.config.get("socket.config") as SocketConfig;
    if (!socketConfig) {
      strapi.log.error("Invalid Socket.IO configuration");
      return;
    }
    strapi.server.httpServer.on("listening", () => {
      const io = new SocketServer(strapi.server.httpServer, {
        cors: socketConfig.cors,
      });

      (strapi as any).io = io;
      strapi.eventHub.emit("socket.ready");
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const socketService = strapi.service("api::socket.socket") as {
      initialize: () => void;
    };
    socketService.initialize();
  },
};
