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

  async queryUnreadCount(params) {
    const { userDocumentId } = params;

    const result = await strapi.db.connection.raw(
      `SELECT SUM(t5.unread_count) AS total FROM chats t1 INNER JOIN chat_statuses_chat_lnk t2 ON t1.id=t2.chat_id INNER JOIN chat_statuses_user_lnk t3 ON t2.id=t3.chat_status_id INNER JOIN up_users t4 ON t3.user_id=t4.id INNER JOIN chat_statuses t5 ON t2.chat_status_id=t5.id WHERE t4.document_id=?`,
      [userDocumentId]
    );

    const total = result[0][0].total;

    return { data: total };
  },
}));
