/**
 * notification controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::notification.notification",
  ({ strapi }) => ({
    async unreadCount(ctx) {
      return await strapi
        .service("api::notification.notification")
        .unreadCount(ctx);
    },
  })
);
