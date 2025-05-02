export default {
  routes: [
    {
      method: "GET",
      path: "/tags/popular",
      handler: "api::tag.tag.findPopularTags",
    },
    {
      method: "GET",
      path: "/tags/popular-page",
      handler: "api::tag.tag.findPopularPageTags",
    },
  ],
};
