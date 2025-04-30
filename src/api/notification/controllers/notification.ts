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

    async updateFriendRequestNotification(ctx) {
      const params = {
        data: ctx.request.body.data,
      };
      const result = await strapi
        .service("api::notification.notification")
        .updateFriendRequestNotification(ctx.params.id, params);

      return result;
    },
  })
);
