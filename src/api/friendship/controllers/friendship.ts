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
          requester: ctx.state.user.documentId,
          recipient: body.data.recipient,
        },
      };

      const result = await strapi
        .service("api::friendship.friendship")
        .create(params);

      const sanitizedResult = await this.sanitizeOutput(result, ctx);
      return sanitizedResult;
    },

    async update(ctx) {
      await this.validateQuery(ctx);
      const query = await this.sanitizeQuery(ctx);
      const params: any = await this.sanitizeInput(ctx.request.body, ctx);
        console.log("@@", ctx.params)
      const result = await strapi
        .service("api::friendship.friendship")
        .update(ctx.params.id, {
            data: {
                ...params.data,
                notificationId: query.notificationId
            }
        });

      const sanitizedResult = await this.sanitizeOutput(result, ctx);
      return sanitizedResult;
    },
  })
);
