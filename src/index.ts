import type { Core } from "@strapi/strapi";
import { initialize as initializeRedis } from "./services/redis";
import { initialize as initializeIO } from "./services/socket";
import { initialize as initializeExpo } from "./services/expo";

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
    initializeRedis(strapi);
    initializeIO(strapi);
    initializeExpo(strapi);
  },
};
