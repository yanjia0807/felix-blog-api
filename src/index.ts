import type { Core } from "@strapi/strapi";
import { createRedisClient } from "./services/redis";
import { createSocketManager } from "./services/socket";
import { createExpoManager } from "./services/expo";

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    (strapi as any).redis = createRedisClient(strapi);

    const socketManager = createSocketManager(strapi);
    socketManager.initialize();
    (strapi as any).socketManager = socketManager;
    (strapi as any).expo = createExpoManager(strapi);
  },
};
