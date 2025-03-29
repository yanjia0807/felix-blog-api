/**
 * post service
 */

import { factories } from "@strapi/strapi";
import _ from "lodash";
const { sanitize, validate } = strapi.contentAPI;
import { transformItem } from "../../../utils";

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
    const pageSize = pagination?.pageSize || 25;
    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize, 10);

    const totalResult = await strapi.db.connection.raw(
      `SELECT COUNT(t1.id) AS total FROM files t1 INNER JOIN files_related_mph t2 ON t1.id=t2.file_id INNER JOIN posts t3 ON t2.related_type='api::post.post' AND t3.published_at IS NOT NULL AND t2.related_id=t3.id AND (t2.field='attachments' OR t2.field='cover') INNER JOIN posts_author_lnk t4 ON t3.id=t4.post_id INNER JOIN up_users t5 ON t4.user_id=t5.id WHERE t5.document_id=?`,
      [userDocumentId]
    );

    const total = totalResult[0][0].total;
    const pageCount = Math.ceil(total / pageSize);

    const data = await strapi.db.connection.raw(
      `SELECT t1.document_id,t1.NAME,t1.alternative_text,t1.caption,t1.width,t1.height,t1.formats,t1.mime,t1.size,t1.url,t6.file_id AS 'attachmentExtras:attachment:id',t6.id AS 'attachmentExtras:thumbnail:id',t6.NAME AS 'attachmentExtras:thumbnail:name',t6.alternative_text AS 'attachmentExtras:thumbnail:alternative:text',t6.caption AS 'attachmentExtras:thumbnail:caption',t6.width AS 'attachmentExtras:thumbnail:width',t6.height AS 'attachmentExtras:thumbnail:height',t6.formats AS 'attachmentExtras:thumbnail:formats',t6.mime AS 'attachmentExtras:thumbnail:mime',t6.size AS 'attachmentExtras:thumbnail:size',t6.url AS 'attachmentExtras:thumbnail:url' FROM files t1 INNER JOIN files_related_mph t2 ON t1.id=t2.file_id INNER JOIN posts t3 ON t2.related_type='api::post.post' AND t3.published_at IS NOT NULL AND t2.related_id=t3.id AND (t2.field='attachments' OR t2.field='cover') INNER JOIN posts_author_lnk t4 ON t3.id=t4.post_id INNER JOIN up_users t5 ON t4.user_id=t5.id LEFT JOIN (
        SELECT t1.id AS 'file_id',t2.*FROM (
        SELECT t1.id,t2.related_id FROM files t1 INNER JOIN files_related_mph t2 ON t1.id=t2.file_id AND t2.related_type='shared.attachment-extra' AND t2.field='attachment') t1 LEFT JOIN (
        SELECT t1.*,t2.related_id FROM files t1 INNER JOIN files_related_mph t2 ON t1.id=t2.file_id AND t2.related_type='shared.attachment-extra' AND t2.field='thumbnail') t2 ON t1.related_id=t2.related_id INNER JOIN posts_cmps t3 ON t3.component_type='shared.attachment-extra' AND t3.field='attachmentExtras' AND t3.cmp_id=t1.related_id INNER JOIN posts t4 ON t3.entity_id=t4.id AND t4.published_at IS NOT NULL) t6 ON t1.id=t6.file_id WHERE t5.document_id=? LIMIT ? OFFSET ?`,
      [userDocumentId, limit, offset]
    );

    const dataJson =
      data && data[0] ? data[0].map((item: any) => transformItem(item)) : [];
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

  async findUserDraftPosts(ctx: any) {
    const schema = strapi.contentType("api::post.post");
    const { auth, user } = ctx.state;
    await validate.query(ctx.query, schema, { auth });
    const { pagination } = ctx.query;
    const { documentId: userDocumentId } = user;

    const page = pagination?.page ? parseInt(pagination?.page) : 1;
    const pageSize = pagination?.pageSize ? parseInt(pagination?.pageSize) : 20;
    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    const totalResult = await strapi.db.connection.raw(
      `SELECT COUNT(*) as 'total' FROM posts t1 INNER JOIN posts_author_lnk t2 ON t1.id=t2.post_id INNER JOIN up_users t3 ON t2.user_id=t3.id INNER JOIN (
        SELECT document_id FROM posts GROUP BY document_id HAVING MAX(published_at) IS NULL) AS t2 ON t1.document_id=t2.document_id WHERE t3.document_id=?`,
      [userDocumentId]
    );

    const total = parseInt(totalResult[0][0].total);
    const pageCount = Math.ceil(total / pageSize);

    const data = await strapi.db.connection.raw(
      `SELECT t1.*,t4.username,t5.id AS 'avatar:id',t5.document_id AS 'avatar:document_id',t5.alternative_text AS 'avatar:alternative_text',t5.width AS 'avatar:width',t5.height AS 'avatar:height',t5.formats AS 'avatar:formats',t6.id AS 'cover:id',t6.document_id AS 'cover:document_id',t6.alternative_text AS 'cover:alternative_text',t6.width AS 'cover:width',t6.height AS 'cover:height',t6.formats AS 'cover:formats',t8.id AS 'poi:id',t8.NAME AS 'poi:name',t8.location AS 'poi:location',t8.type AS 'poi:type',t8.typecode AS 'poi:typecode',t8.pname AS 'poi:pname',t8.cityname AS 'poi:cityname',t8.adname AS 'poi:adname',t8.address AS 'poi:address',t8.pcode AS 'poi:pcode',t8.adcode AS 'poi:adcode',t8.citycode AS 'poi:citycode' FROM posts t1 INNER JOIN (
        SELECT document_id FROM posts GROUP BY document_id HAVING MAX(published_at) IS NULL) AS t2 ON t1.document_id=t2.document_id INNER JOIN posts_author_lnk t3 ON t1.id=t3.post_id INNER JOIN up_users t4 ON t3.user_id=t4.id INNER JOIN (
        SELECT sub1.id,sub1.document_id,sub1.alternative_text,sub1.width,sub1.height,sub1.formats,sub2.related_id FROM files sub1 INNER JOIN files_related_mph sub2 ON sub1.id=sub2.file_id WHERE sub2.related_type='plugin::users-permissions.user' AND sub2.field="avatar") t5 ON t4.id=t5.related_id LEFT JOIN (
        SELECT sub1.id,sub1.document_id,sub1.alternative_text,sub1.width,sub1.height,sub1.formats,sub2.related_id FROM files sub1 INNER JOIN files_related_mph sub2 ON sub1.id=sub2.file_id WHERE sub2.related_type='api::post.post' AND sub2.field='cover') t6 ON t1.id=t6.related_id LEFT JOIN posts_cmps t7 ON t7.component_type='shared.poi' AND t7.field='poi' AND t7.entity_id=t1.id LEFT JOIN components_shared_pois t8 ON t7.cmp_id=t8.id WHERE t4.document_id=? ORDER BY t1.created_at DESC LIMIT ? OFFSET ?`,
      [userDocumentId, limit, offset]
    );

    const dataJson =
      data && data[0] ? data[0].map((item: any) => transformItem(item)) : [];

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

  async unpublish(ctx: any) {
    const schema = strapi.contentType("api::post.post");
    const { auth } = ctx.state;
    await validate.query(ctx.query, schema, { auth });
    const { id } = ctx.params;

    return await strapi.documents("api::post.post").unpublish({
      documentId: id,
    });
  },
});
