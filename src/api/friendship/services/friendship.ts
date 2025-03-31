/**
 * friendship service
 */

import { factories } from "@strapi/strapi";
import { errors } from "@strapi/utils";
import _ from "lodash";

export default factories.createCoreService("api::friendship.friendship", {
  async create(params: any) {
    const {
      data: { sender, receiver },
    } = params;

    const friendships = await strapi
      .documents("api::friendship.friendship")
      .findMany({
        filters: {
          $or: [
            {
              sender: {
                documentId: sender,
              },
              receiver: {
                documentId: receiver,
              },
            },
            {
              sender: {
                documentId: receiver,
              },
              receiver: {
                documentId: sender,
              },
            },
          ],
        },
      });

    if (_.some(friendships, { state: "accepted" })) {
      throw new errors.ValidationError("already accepted");
    }

    if (_.some(friendships, { state: "requested", sender })) {
      throw new errors.ValidationError("already requested");
    }

    const result = await super.create({
      data: params.data,
      populate: {
        sender: {
          populate: {
            avatar: true,
          },
        },
        receiver: true,
      },
    });

    const notification = await strapi
      .documents("api::notification.notification")
      .create({
        data: {
          type: "friendship" as any,
          user: result.receiver.id,
          data: JSON.stringify({
            documentId: result.documentId,
            sender: {
              id: result.sender.id,
              documentId: result.sender.documentId,
              username: result.sender.username,
              avatar: result.sender.avatar,
              gender: result.sender.gender,
              birthday: result.sender.birthday,
              district: result.sender.district,
            },
          }),
        },
      });

    (strapi as any).io.to(result.receiver.id).emit("notification:create", {
      data: notification,
    });

    return result;
  },

  async cancel(params: any) {
    const {
      data: { documentId, user },
    } = params;

    const result = await super.update(documentId, {
      data: {
        state: "canceled",
      },
      populate: {
        receiver: {
          populate: {
            avatar: true,
          },
        },
        sender: {
          populate: {
            avatar: true,
          },
        },
      },
    });

    const notificationUser =
      result.sender.documentId === user ? result.receiver : result.sender;

    const currentUser =
      result.sender.documentId === user ? result.sender : result.receiver;

    const notification = await strapi
      .documents("api::notification.notification")
      .create({
        data: {
          type: "friendship-cancel" as any,
          user: notificationUser.id,
          data: JSON.stringify({
            documentId: result.documentId,
            user: {
              id: currentUser.id,
              documentId: currentUser.documentId,
              username: currentUser.username,
              avatar: currentUser.avatar,
              gender: currentUser.gender,
              birthday: currentUser.birthday,
              district: currentUser.district,
            },
          }),
        },
      });

    (strapi as any).io.to(notificationUser.id).emit("notification:create", {
      data: notification,
    });

    return result;
  },

  async findFriendsOfUser(user: any) {
    const friendships = await strapi
      .documents("api::friendship.friendship")
      .findMany({
        filters: {
          $and: [
            { state: "accepted" },
            {
              $or: [{ sender: user }, { receiver: user }],
            },
          ],
        },
        populate: {
          sender: {
            fields: [],
          },
          receiver: {
            fields: [],
          },
        },
      });

    const friends = _.uniq(
      _.map(friendships, (item: any) =>
        item.sender.id === user ? item.receiver.id : item.sender.id
      )
    );

    return friends;
  },
});
