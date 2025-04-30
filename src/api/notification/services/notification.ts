/**
 * notification service
 */

import { factories } from "@strapi/strapi";
import _ from "lodash";

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

  async updateFriendRequestNotification(documentId, params) {
    const {data} = params;

    const notification = await super.update(documentId, {
      data: {
        state: "read",
        feedback: JSON.stringify({ state: data.state }),
      },
    });

    const friendRequest = await strapi
      .documents("api::friend-request.friend-request")
      .update({
        documentId: notification.data.friendRequest.documentId,
        data: {
          state: data.state,
        },
        populate: {
          receiver: {
            populate: {
              avatar: true,
              district: true,
              friends: {
                fields: [],
              },
            },
          },
          sender: {
            populate: {
              friends: {
                fields: [],
              },
            },
          },
        },
      });

    if (friendRequest.state === "accepted") {
      await strapi.documents("plugin::users-permissions.user").update({
        documentId: friendRequest.sender.documentId,
        data: {
          friends: _.concat(
            _.map(friendRequest.sender.friends, (item: any) => item.id),
            friendRequest.receiver.id
          ),
          followings: _.concat(
            _.map(friendRequest.sender.followers, (item: any) => item.id),
            friendRequest.receiver.id
          ),
        },
      });

      await strapi.documents("plugin::users-permissions.user").update({
        documentId: friendRequest.receiver.documentId,
        data: {
          friends: _.concat(
            _.map(friendRequest.receiver.friends, (item: any) => item.id),
            friendRequest.sender.id
          ),
          followings: _.concat(
            _.map(friendRequest.receiver.followers, (item: any) => item.id),
            friendRequest.sender.id
          ),
        },
      });

      (strapi as any).io.to(friendRequest.sender.id).emit("friend:add", {
        data: {
          friend: {
            id: friendRequest.receiver.id,
            documentId: friendRequest.receiver.documentId,
          }
        },
      });
    }

    const notification1 = await super.create({
      data: {
        type: "friend-feedback" as any,
        user: friendRequest.sender.id,
        data: JSON.stringify({
          friendRequest: {
            id: friendRequest.id,
            documentId: friendRequest.documentId,
            receiver: {
              id: friendRequest.receiver.id,
              documentId: friendRequest.receiver.documentId,
              username: friendRequest.receiver.username,
              avatar: friendRequest.receiver.avatar,
              gender: friendRequest.receiver.gender,
              birthday: friendRequest.receiver.birthday,
              district: friendRequest.receiver.district,
            },
            sender: {
              id: friendRequest.sender.id,
              documentId: friendRequest.documentId,
            },
            state: friendRequest.state,
          },
        }),
      },
    });

    (strapi as any).io.to(friendRequest.sender.id).emit("notification:create", {
      data: notification1,
    });

    return {
      data: notification,
    };
  },
});
