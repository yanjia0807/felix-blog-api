export default {
  routes: [
    {
      method: "PUT",
      path: "/friendships/:id/cancel",
      handler: "api::friendship.friendship.cancel",
    },
  ],
};
