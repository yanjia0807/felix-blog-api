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

    async findUserDraftPosts(ctx) {
      return strapi.service("api::post.post").findUserDraftPosts(ctx);
    },

    async findTrendingPosts(ctx) {
      return strapi.service("api::post.post").findTrendingPosts(ctx);
    },

    async findFollowingPosts(ctx) {
      return strapi.service("api::post.post").findFollowingPosts(ctx);
    },

    async findDiscoverPosts(ctx) {
      return strapi.service("api::post.post").findDiscoverPosts(ctx);
    },

    async unpublish(ctx) {
      return strapi.service("api::post.post").unpublish(ctx);
    },
  })
);
