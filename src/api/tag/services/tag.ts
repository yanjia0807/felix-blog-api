/**
 * tag service
 */

import { factories } from "@strapi/strapi";
import { transformItem } from "../../../utils";
import _ from "lodash";

export default factories.createCoreService("api::tag.tag", {
  async findPopularTags(ctx: any) {
    const limit = parseInt(ctx.query.limit || 20);
    const data = await strapi.db.connection.raw(
      `SELECT t1.id, t1.document_id, t1.name, t1.code FROM tags t1 LEFT JOIN (
        SELECT t1.id,COUNT(t1.id) AS 'total' FROM tags t1 LEFT JOIN tags_posts_lnk t2 ON t1.id=t2.tag_id GROUP BY t1.id) t2 ON t1.id=t2.id ORDER BY t2.total DESC LIMIT ? `,
      [limit]
    );

    const dataJson =
      data && data[0] ? data[0].map((item: any) => transformItem(item)) : [];

    return {
      data: dataJson,
    };
  },

  async findPopularPageTags(ctx: any) {
    const { pagination, keywords } = ctx.query;

    const page = parseInt(pagination?.page || 1);
    const pageSize = parseInt(pagination?.pageSize || 25);
    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    const knex = strapi.db.connection;

    let totalQuery = knex("tags as t1").count("t1.id as total");
    if (!_.isNil(keywords) && !_.isEmpty(keywords)) {
      totalQuery = totalQuery.where("t1.name", "like", `%${keywords}%`);
    }

    const totalResult: any = await totalQuery.first();
    const total = parseInt(totalResult?.total) || 0;
    const pageCount = Math.ceil(total / pageSize);

    let dataQuery = knex("tags as t1")
      .select("t1.id", "t1.document_id", "t1.name", "t1.code")
      .leftJoin(
        knex("tags as t1")
          .select("t1.id", knex.raw("COUNT(t1.id) AS ??", ["total"]))
          .leftJoin("tags_posts_lnk as t2", "t1.id", "t2.tag_id")
          .groupBy("t1.id")
          .as("t2"),
        "t1.id",
        "t2.id"
      )
      .orderBy("t2.total", "desc")
      .limit(limit)
      .offset(offset);

    if (!_.isNil(keywords) && !_.isEmpty(keywords)) {
      dataQuery = dataQuery.where("t1.name", "like", `%${keywords}%`);
    }

    const data = await dataQuery;
    const dataJson = data ? data.map((item: any) => transformItem(item)) : [];

    return {
      data: dataJson,
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount,
          total,
        },
      },
    };
  },
});
