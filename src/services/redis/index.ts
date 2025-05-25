import { Core } from "@strapi/strapi";
import Redis from "ioredis";

export let redis: Redis | null = null;

export const initialize = (strapi: Core.Strapi) => {
  const config: any = strapi.config.get("redis");
  const { host, port, username, password } = config;

  if (!redis) {
    redis = new Redis({
      host,
      port,
      username,
      password,
    });

    redis.on("connect", () => {
      strapi.log.info(`redis connected to ${host}:${port}`);
    });

    redis.on("ready", () => {
      strapi.log.info(`redis Ready on ${host}:${port}`);
    });

    redis.on("error", (err) => {
      strapi.log.error(`redis error: ${err.message}`);
    });
  }
};
