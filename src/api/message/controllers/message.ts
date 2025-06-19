/**
 * message controller
 */

import { factories } from "@strapi/strapi";
import _ from "lodash";
import { errors } from "@strapi/utils";

export default factories.createCoreController("api::message.message", {
  async create(params) {
    const data = params.request.body.data;
    const senderDocumentId = data.sender;
    const receiverDocumentId = data.receiver;

    const receiver = await strapi
      .documents("plugin::users-permissions.user")
      .findOne({
        documentId: receiverDocumentId,
        fields: [],
        populate: {
          blockUsers: {
            fields: [],
          },
        },
      });

    if (_.some(receiver.blockUsers, ["documentId", senderDocumentId])) {
      throw new errors.ApplicationError("对方屏蔽了你");
    }

    const result = await super.create(params);

    return result;
  },
});
