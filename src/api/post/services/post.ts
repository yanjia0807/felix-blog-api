/**
 * post service
 */

import { factories } from "@strapi/strapi";
import _ from "lodash";
const { sanitize, validate } = strapi.contentAPI;

export default factories.createCoreService("api::post.post", {
  async find(params) {
    const { results, pagination } = await super.find(params);

    const lastComments = await Promise.all(
      results.map((item: any) =>
        strapi.documents("api::comment.comment").findMany({
          filters: {
            post: { documentId: item.documentId },
          },
          sort: "createdAt:desc",
          start: 0,
          limit: 1,
          populate: {
            user: {
              populate: {
                avatar: {
                  fields: ["formats", "name", "alternativeText"],
                },
              },
              fields: ["username"],
            },
          },
          fields: ["createdAt", "content"],
        })
      )
    );

    const resultsWithLastComments = _.map(
      results,
      (item: any, index: number) => ({
        ...item,
        lastComment:
          lastComments[index] && lastComments[index].length > 0
            ? lastComments[index][0]
            : null,
      })
    );

    return { results: resultsWithLastComments, pagination };
  },

  async findRecentAuthors(ctx: any) {
    let data = await strapi.db.connection.raw(
      `SELECT t1.id,t1.document_id AS 'documentId',t1.username,t2.formats FROM (
          SELECT*FROM (
          SELECT t3.id,t3.document_id,t3.username FROM posts t1 INNER JOIN posts_author_lnk t2 ON t1.id=t2.post_id INNER JOIN up_users t3 ON t2.user_id=t3.id ORDER BY t1.created_at DESC) t1 GROUP BY t1.id,t1.document_id,t1.username) t1 LEFT JOIN (
          SELECT t1.related_id,t2.formats FROM files_related_mph t1 INNER JOIN files t2 ON t1.file_id=t2.id WHERE t1.related_type='plugin::users-permissions.user') t2 ON t1.id=t2.related_id LIMIT 0, 20`
    );

    return {
      data: (data && data[0]) || [],
    };
  },

  async findPhotos(ctx: any) {
    const schema = strapi.contentType("api::post.post");
    const { auth } = ctx.state;
    await validate.query(ctx.query, schema, { auth });
    const { userDocumentId, pagination } = ctx.query;

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize, 10);

    const totalResult = await strapi.db.connection.raw(
      `SELECT COUNT(*) as total
        FROM (
          SELECT t2.id
          FROM files_related_mph t1
          LEFT JOIN files t2 ON t1.file_id=t2.id
          LEFT JOIN posts t3 ON t1.related_id=t3.id
          LEFT JOIN posts_author_lnk t4 ON t3.id=t4.post_id
					LEFT JOIN up_users t5 ON t4.user_id = t5.id
          WHERE t1.related_type='api::post.post'
          AND t1.field="cover"
          AND t3.id IS NOT NULL
          AND t5.document_id=?
          UNION
          SELECT t2.id
          FROM files_related_mph t1
          LEFT JOIN files t2 ON t1.file_id=t2.id
          LEFT JOIN components_shared_attachments t3 ON t1.related_id=t3.id
          LEFT JOIN posts_cmps t4 ON t3.id=t4.cmp_id
          LEFT JOIN posts t5 ON t4.entity_id=t5.id
          LEFT JOIN posts_author_lnk t6 ON t5.id=t6.post_id
					LEFT JOIN up_users t7 ON t6.user_id = t7.id
          WHERE t1.related_type='shared.attachment'
          AND t3.type="image"
          AND t5.id IS NOT NULL
          AND t7.document_id=?) AS total`,
      [userDocumentId, userDocumentId]
    );

    const total = totalResult[0][0].total;
    const pageCount = Math.ceil(total / pageSize);

    let data = await strapi.db.connection.raw(
      `SELECT t2.id,t2.document_id,t2.NAME,t2.alternative_text,t2.caption,t2.width,t2.height,t2.formats,t2.mime,t2.size,t2.url
        FROM files_related_mph t1
        LEFT JOIN files t2 ON t1.file_id=t2.id
        LEFT JOIN posts t3 ON t1.related_id=t3.id
        LEFT JOIN posts_author_lnk t4 ON t3.id=t4.post_id
				LEFT JOIN up_users t5 ON t4.user_id = t5.id
        WHERE t1.related_type='api::post.post'
        AND t1.field="cover"
        AND t3.id IS NOT NULL
        AND t5.document_id=?
        UNION
        SELECT t2.id,t2.document_id,t2.NAME,t2.alternative_text,t2.caption,t2.width,t2.height,t2.formats,t2.mime,t2.size,t2.url
        FROM files_related_mph t1
        LEFT JOIN files t2 ON t1.file_id=t2.id
        LEFT JOIN components_shared_attachments t3 ON t1.related_id=t3.id
        LEFT JOIN posts_cmps t4 ON t3.id=t4.cmp_id
        LEFT JOIN posts t5 ON t4.entity_id=t5.id
        LEFT JOIN posts_author_lnk t6 ON t5.id=t6.post_id
				LEFT JOIN up_users t7 ON t6.user_id = t7.id
        WHERE t1.related_type='shared.attachment'
        AND t3.type="image"
        AND t5.id IS NOT NULL
        AND t7.document_id=?
        LIMIT ? OFFSET ?`,
      [userDocumentId, userDocumentId, limit, offset]
    );

    return {
      data: (data && data[0]) || [],
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
