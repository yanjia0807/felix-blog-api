/**
 * tag controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController("api::tag.tag", ({ strapi }) => ({
  async findPopularTags(ctx) {
    return strapi.service("api::tag.tag").findPopularTags(ctx);
  },

  async findPopularPageTags(ctx) {
    return strapi.service("api::tag.tag").findPopularPageTags(ctx);
  },
}));
