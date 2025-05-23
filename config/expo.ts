export default ({ env }) => ({
  checkRule: '*/60 * * * *', // 每小时检查一次
  ticketStaleTime: 24 * 60 * 60 * 1000, // 24 小时
});
