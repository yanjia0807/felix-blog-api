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
      method: "PUT",
      path: "/posts/:id/unpublish",
      handler: "api::post.post.unpublish",
    },
  ],
};
