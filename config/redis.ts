export default ({ env }) => ({
  host: env("REDIS_HOST", "localhost"),
  port: env("REDIS_PORT", 6379),
  username: env("REDIS_USERNAME", ""),
  password: env("REDIS_PASSWORD", ""),
});
