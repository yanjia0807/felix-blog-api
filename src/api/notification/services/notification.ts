/**
 * notification service
 */

import { factories } from "@strapi/strapi";
const { sanitize, validate } = strapi.contentAPI;

export default factories.createCoreService("api::notification.notification", {
  async unreadCount(ctx) {
    const { auth, user } = ctx.state;
    const schema = strapi.getModel("api::notification.notification");
    await validate.query(ctx.query, schema, { auth });

    return await strapi.documents("api::notification.notification").count({
      filters: {
        user: user.id,
        state: "unread",
      },
    });
  },
});
