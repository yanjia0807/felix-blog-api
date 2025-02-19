export default {
  routes: [
    {
      method: "GET",
      path: "/notifications/unread-count",
      handler: "api::notification.notification.unreadCount",
    }
  ],
};
