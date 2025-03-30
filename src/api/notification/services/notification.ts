/**
 * notification service
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreService("api::notification.notification", {
  async count(params) {
    const {
      data: { userId },
    } = params;

    const count = await strapi
      .documents("api::notification.notification")
      .count({
        filters: {
          user: userId,
          state: "unread",
        },
      });

    return { data: count };
  },

  async updateFriendshipNotification(documentId, params) {
    const notification = await super.update(documentId, {
      data: {
        state: "read",
        feedback: JSON.stringify({ state: params.data.state }),
      },
    });

    const friendship = await strapi
      .documents("api::friendship.friendship")
      .update({
        documentId: params.data.friendship,
        data: {
          state: params.data.state,
        },
        populate: {
          receiver: {
            populate: {
              avatar: true,
            },
          },
          sender: true,
        },
      });

    const notification1 = await super.create({
      data: {
        type: "friendship-feedback" as any,
        user: friendship.sender.id,
        data: JSON.stringify({
          documentId: friendship.documentId,
          receiver: {
            id: friendship.receiver.id,
            documentId: friendship.receiver.documentId,
            username: friendship.receiver.username,
            avatar: friendship.receiver.avatar,
            gender: friendship.receiver.gender,
            birthday: friendship.receiver.birthday,
            district: friendship.receiver.district,
          },
          state: friendship.state,
        }),
      },
    });

    (strapi as any).io.to(friendship.sender.id).emit("notification:create", {
      data: notification1,
    });

    return {
      data: notification,
    };
  },
});
