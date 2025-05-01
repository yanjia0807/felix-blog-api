/**
 * post controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::post.post",
  ({ strapi }) => ({
    async findPhotos(ctx) {
      return strapi.service("api::post.post").findPhotos(ctx);
    },

    async findTrendingPosts(ctx) {
      return strapi.service("api::post.post").findTrendingPosts(ctx);
    },
  })
);
