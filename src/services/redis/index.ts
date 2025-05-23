import { Core } from "@strapi/strapi";
import Redis from "ioredis";

let client: Redis | null = null;

export const createRedisClient = (strapi: Core.Strapi) => {
  if (!client) {
    initialize(strapi);
  }
  return client;
};

const initialize = (strapi: Core.Strapi) => {
  const { host, port, username, password } = strapi.config.get("redis") as any;
  client = new Redis({
    host,
    port,
    username,
    password,
  });

  client.on("connect", () => {
    strapi.log.info(`redis connected to ${host}:${port}`);
  });

  client.on("error", (err) => {
    strapi.log.error(`redis error: ${err.message}`);
  });

  client.on("ready", () => {
    strapi.log.info(`redis Ready on ${host}:${port}`);
  });
};
