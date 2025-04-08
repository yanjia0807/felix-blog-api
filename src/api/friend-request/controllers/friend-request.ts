/**
 * friend-request controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::friend-request.friend-request",
  ({ strapi }) => ({
    async create(ctx) {
      await this.validateQuery(ctx);
      const body: any = await this.sanitizeInput(ctx.request.body, ctx);
      const params = {
        data: {
          senderDocumentId: ctx.state.user.documentId,
          receiverDocumentId: body.data.receiverDocumentId,
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
