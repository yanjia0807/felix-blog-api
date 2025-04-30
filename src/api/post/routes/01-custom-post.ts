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
    {
      method: "GET",
      path: "/posts/user-draft-posts",
      handler: "api::post.post.findUserDraftPosts",
    },
    {
      method: "GET",
      path: "/posts/trending",
      handler: "api::post.post.findTrendingPosts",
    },
    {
      method: "GET",
      path: "/posts/following",
      handler: "api::post.post.findFollowingPosts",
    },
    {
      method: "GET",
      path: "/posts/discover",
      handler: "api::post.post.findDiscoverPosts",
    },
    {
      method: "PUT",
      path: "/posts/:id/unpublish",
      handler: "api::post.post.unpublish",
    },
  ],
};
