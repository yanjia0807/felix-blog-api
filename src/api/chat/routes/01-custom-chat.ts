export default {
  routes: [
    {
      method: "POST",
      path: "/chats/init",
      handler: "api::chat.chat.init",
    },
    {
      method: "GET",
      path: "/chats/unread-count",
      handler: "api::chat.chat.queryUnreadCount",
    },
  ],
};
