export default ({ env }) => ({
  checkInterval: 20 * 60 * 1000, // 20 分钟
  cleanupInterval: 4 * 60 * 60 * 1000, // 4 小时
  ticketStaleTime: 24 * 60 * 60 * 1000, // 24 小时
});
