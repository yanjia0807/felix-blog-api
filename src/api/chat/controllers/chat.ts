/**
 * chat controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::chat.chat",
  ({ strapi }) => ({
    async init(ctx) {
      await this.validateQuery(ctx);
      const sanitizedQueryParams = await this.sanitizeQuery(ctx);
      return await strapi
        .service("api::chat.chat")
        .init(ctx, sanitizedQueryParams);
    },

    async queryUnreadCount(ctx) {
      const params = {
        userDocumentId: ctx.state.user.documentId,
      };
      
      return await strapi.service("api::chat.chat").queryUnreadCount(params);
    },
  })
);
