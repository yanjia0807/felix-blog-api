/**
 * friendship controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::friendship.friendship",
  ({ strapi }) => ({
    async create(ctx) {
      await this.validateQuery(ctx);
      const body: any = await this.sanitizeInput(ctx.request.body, ctx);
      const params = {
        data: {
          sender: ctx.state.user.documentId,
          receiver: body.data.receiver,
        },
      };

      const result = await strapi
        .service("api::friendship.friendship")
        .create(params);

      const sanitizedResult = await this.sanitizeOutput(result, ctx);
      return sanitizedResult;
    },

    async cancel(ctx) {
      await this.validateQuery(ctx);
      const params = {
        data: {
          documentId : ctx.params.id,
          user: ctx.state.user.documentId
        }
      }

      const result = await strapi
        .service("api::friendship.friendship")
        .cancel(params);

      const sanitizedResult = await this.sanitizeOutput(result, ctx);
      return sanitizedResult;
    }
  })
);
