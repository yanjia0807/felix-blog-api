/**
 * online-user service
 */

import { factories } from "@strapi/strapi";
import _, { orderBy } from "lodash";

export default factories.createCoreService(
  "api::online-user.online-user",
  ({ strapi }) => ({
    async createOnlineUser(userId) {
      const onlineUser = await super.create({
        data: {
          user: {
            id: userId,
          },
        },
        populate: {
          user: {
            fields: [],
          },
        },
      });

      const user: any = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: onlineUser.user.documentId,
          fields: ["username"],
          populate: {
            avatar: true,
            friends: {
              fields: [],
            },
          },
        });

      _.forEach(
        _.map(user.friends, (item: any) => item.id),
        (item: any) =>
          (strapi as any).io.to(item).emit("user:online", {
            data: _.pick(user, ["id", "documentId"]),
          })
      );

      return onlineUser;
    },

    async deleteOnlineUser(onlineUser) {
      const userDocumentId = onlineUser.user.documentId;
      const result = await super.delete(onlineUser.documentId);

      const user: any = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: userDocumentId,
          fields: [],
          populate: {
            friends: {
              fields: [],
            },
          },
        });

      _.forEach(
        _.map(user.friends, (item: any) => item.id),
        (item: any) =>
          (strapi as any).io.to(item).emit("user:offline", {
            data: _.pick(user, ["id", "documentId"]),
          })
      );

      return result;
    },

    async findOnlineFriends(params) {
      const user: any = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: params.data.userDocumentId,
          fields: [],
          populate: {
            friends: {
              fields: [],
            },
          },
        });

      const queryParams = {
        filters: {
          user: {
            documentId: {
              $in: _.map(user.friends, (item: any) => item.documentId),
            },
          },
        },
        populate: {
          user: {
            fields: ["username"],
            populate: ["avatar"],
          },
        },
        pagination: params.pagination,
      };

      const { results, pagination } = await super.find(queryParams);

      return {
        data: results,
        meta: {
          pagination,
        },
      };
    },
  })
);
