/**
 * chat service
 */

import { factories } from "@strapi/strapi";
import _ from "lodash";
const { sanitize, validate } = strapi.contentAPI;

export default factories.createCoreService("api::chat.chat", ({ strapi }) => ({
  async init(ctx) {
    const schema = strapi.contentType("api::chat.chat");
    const { auth, user } = ctx.state;
    await validate.query(ctx.query, schema, { auth });

    const params = _.pick(ctx.request.body, ["users"]);
    const data: any = await strapi.documents("api::chat.chat").create({
      data: {
        ...params,
        initiator: user.id,
      },
    });

    await Promise.all([
      strapi.documents("api::chat-status.chat-status").create({
        data: {
          chat: data.id,
          user: {
            documentId: params.users[0],
          },
        },
      }),
      strapi.documents("api::chat-status.chat-status").create({
        data: {
          chat: data.id,
          user: {
            documentId: params.users[1],
          },
        },
      }),
    ]);

    return {
      data,
    };
  },
}));
