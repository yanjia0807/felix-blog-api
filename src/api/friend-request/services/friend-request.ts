/**
 * friend-request service
 */

import { factories } from "@strapi/strapi";
import _ from "lodash";
import { errors } from "@strapi/utils";

export default factories.createCoreService(
  "api::friend-request.friend-request",
  {
    async create(params: any) {
      const {
        data: { senderDocumentId, receiverDocumentId },
      } = params;

      const user: any = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: senderDocumentId,
          fields: [],
          populate: {
            friends: {
              fields: [],
            },
          },
        });

      const isFriend = _.some(user.friends, {
        documentId: receiverDocumentId,
      });

      if (isFriend) {
        throw new errors.ValidationError("already accepted");
      }

      const friendRequest = await super.create({
        data: {
          sender: senderDocumentId,
          receiver: receiverDocumentId,
        },
        populate: {
          sender: {
            populate: {
              avatar: true,
              district: true,
            },
          },
          receiver: true,
        },
      });

      const notification = await strapi
        .documents("api::notification.notification")
        .create({
          data: {
            type: "friend-request" as any,
            user: friendRequest.receiver.id,
            data: JSON.stringify({
              friendRequest: {
                id: friendRequest.id,
                documentId: friendRequest.documentId,
                sender: {
                  id: friendRequest.sender.id,
                  documentId: friendRequest.sender.documentId,
                  username: friendRequest.sender.username,
                  avatar: friendRequest.sender.avatar,
                  gender: friendRequest.sender.gender,
                  birthday: friendRequest.sender.birthday,
                  district: friendRequest.sender.district,
                },
                receiver: {
                  id: friendRequest.receiver.id,
                  documentId: friendRequest.receiver.documentId,
                },
              },
            }),
          },
        });

      (strapi as any).io
        .to(friendRequest.receiver.id)
        .emit("notification:create", {
          data: notification,
        });

      return friendRequest;
    },
  }
);
