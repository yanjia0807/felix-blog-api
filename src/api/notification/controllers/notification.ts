/**
 * notification controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::notification.notification",
  ({ strapi }) => ({
    async count(ctx) {
      const params = {
        data: {
          userId: ctx.state.user.id,
        },
      };
      
      const result = await strapi
        .service("api::notification.notification")
        .count(params);

      return result;
    },

    async updateFriendshipNotification(ctx) {
      const params: any = await this.sanitizeInput(ctx.request.body, ctx);

      const result = await strapi
        .service("api::notification.notification")
        .updateFriendshipNotification(ctx.params.id, params);

      return result;
    },
  })
);
