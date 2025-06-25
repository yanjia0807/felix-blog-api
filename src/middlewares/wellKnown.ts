/**
 *  wellknown.ts
 *  place this file under src/middlewares/wellKnown.ts
 */
import { Core } from "@strapi/strapi";

const koaStatic = require("koa-static");

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  strapi.server.routes([
    {
      method: "GET",
      path: "/.well-known/(.*)",
      handler: koaStatic(strapi.dirs.static.public, {
        defer: true,
        hidden: true,
      }),
      config: { auth: false },
    },
  ]);
};