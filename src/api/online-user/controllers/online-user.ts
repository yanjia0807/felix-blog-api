/**
 * online-user controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::online-user.online-user",
  ({ strapi }) => ({
    async findOnlineFriends(ctx) {
      await this.validateQuery(ctx);
      const { pagination } = ctx.query;
      const params = {
        data: {
          userDocumentId: ctx.state.user.documentId,
        },
        pagination
      };

      const result = await strapi
        .service("api::online-user.online-user")
        .findOnlineFriends(params);

      return result;
    },
  })
);
