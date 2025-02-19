/**
 * post controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::post.post",
  ({ strapi }) => ({
    async findRecentAuthors(ctx) {
      return strapi.service("api::post.post").findRecentAuthors(ctx);
    },

    async findPhotos(ctx) {
      return strapi.service("api::post.post").findPhotos(ctx);
    },
  })
);
