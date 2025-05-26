export default {
  routes: [
    {
      method: "GET",
      path: "/notifications/count",
      handler: "api::notification.notification.count",
    },
    {
      method: "PUT",
      path: "/notifications/:id/friend-request",
      handler: "api::notification.notification.updateFriendRequestNotification",
    },
    {
      method: "PUT",
      path: "/notifications/all-read",
      handler: "api::notification.notification.updateNotificationsAllRead",
    }
  ],
};
