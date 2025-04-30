/**
 * friend-request controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::friend-request.friend-request",
  ({ strapi }) => ({
    async create(ctx) {
      const params = {
        data: {
          sender: ctx.state.user.documentId,
          receiver: ctx.request.body.data.receiver,
        },
      };

      const result = await strapi
        .service("api::friend-request.friend-request")
        .create(params);

      const sanitizedResult = await this.sanitizeOutput(result, ctx);
      return sanitizedResult;
    },
  })
);
