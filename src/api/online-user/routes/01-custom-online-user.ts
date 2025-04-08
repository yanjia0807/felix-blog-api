export default {
  routes: [
    {
      method: "GET",
      path: "/online-users/friends",
      handler: "api::online-user.online-user.findOnlineFriends",
    },
  ],
};
