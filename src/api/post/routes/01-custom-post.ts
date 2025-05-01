export default {
  routes: [
    {
      method: "GET",
      path: "/posts/photos",
      handler: "api::post.post.findPhotos",
    },
    {
      method: "GET",
      path: "/posts/trending",
      handler: "api::post.post.findTrendingPosts",
    },
  ],
};
