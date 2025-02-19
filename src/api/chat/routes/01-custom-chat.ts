export default {
  routes: [
    {
      method: "POST",
      path: "/chats/init",
      handler: "api::chat.chat.init",
    },
  ],
};
