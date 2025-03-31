/**
 * online-user service
 */

import { factories } from "@strapi/strapi";
import _ from "lodash";

export default factories.createCoreService(
  "api::online-user.online-user",
  ({ strapi }) => ({
    async createOnlineUser(socket) {
      const result = await super.create({
        data: {
          user: {
            id: socket.userId,
          },
        },
      });

      const friends = await strapi
        .service("api::friendship.friendship")
        .findFriendsOfUser(socket.userId);

      _.forEach(friends, (item: any) =>
        (strapi as any).io.to(item).emit("user:online", socket.userId)
      );

      return result;
    },

    async removeOnlineUser(onlineUser, socket) {
      const result = await super.delete(onlineUser);

      const friends = await strapi
        .service("api::friendship.friendship")
        .findFriendsOfUser(socket.userId);

      _.forEach(friends, (item: any) =>
        (strapi as any).io.to(item).emit("user:offline", socket.userId)
      );

      return result;
    },
  })
);
