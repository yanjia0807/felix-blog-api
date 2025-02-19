export default {
  routes: [
    {
      method: "GET",
      path: "/posts/recent-authors",
      handler: "api::post.post.findRecentAuthors",
    },
    {
      method: "GET",
      path: "/posts/photos",
      handler: "api::post.post.findPhotos",
    },
  ],
};
