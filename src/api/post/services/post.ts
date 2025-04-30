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
      `SELECT t1.document_id,t1.NAME,t1.alternative_text,t1.caption,t1.width,t1.height,t1.formats,t1.mime,t1.size,t1.url,JSON_OBJECT('attachment',JSON_OBJECT('id',t6.file_id),'thumbnail',JSON_OBJECT('id',t6.id,'name',t6.NAME,'alternativeText',t6.alternative_text,'caption',t6.caption,'width',t6.width,'height',t6.height,'formats',t6.formats,'mime',t6.mime,'size',t6.size,'url',t6.url)) AS attachmentExtras FROM files t1 INNER JOIN files_related_mph t2 ON t1.id=t2.file_id INNER JOIN posts t3 ON t2.related_type='api::post.post' AND t3.published_at IS NOT NULL AND t2.related_id=t3.id AND (t2.field='attachments' OR t2.field='cover') INNER JOIN posts_author_lnk t4 ON t3.id=t4.post_id INNER JOIN up_users t5 ON t4.user_id=t5.id LEFT JOIN (
        SELECT t1.id AS file_id,t2.id,t2.NAME,t2.alternative_text,t2.caption,t2.width,t2.height,t2.formats,t2.mime,t2.size,t2.url,t2.related_id FROM (
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
      `SELECT t1.*,t4.username,JSON_OBJECT('id',t5.id,'document_id',t5.document_id,'alternative_text',t5.alternative_text,'width',t5.width,'height',t5.height,'formats',t5.formats) AS avatar,JSON_OBJECT('id',t6.id,'document_id',t6.document_id,'alternative_text',t6.alternative_text,'width',t6.width,'height',t6.height,'formats',t6.formats) AS cover,JSON_OBJECT('id',t8.id,'name',t8.NAME,'longitude',t8.longitude,'latitude',t8.latitude,'type',t8.type,'typecode',t8.typecode,'pname',t8.pname,'cityname',t8.cityname,'adname',t8.adname,'address',t8.address,'pcode',t8.pcode,'adcode',t8.adcode,'citycode',t8.citycode) AS poi FROM posts t1 INNER JOIN (
        SELECT document_id FROM posts GROUP BY document_id HAVING MAX(published_at) IS NULL) AS t2 ON t1.document_id=t2.document_id INNER JOIN posts_author_lnk t3 ON t1.id=t3.post_id INNER JOIN up_users t4 ON t3.user_id=t4.id INNER JOIN (
        SELECT sub1.id,sub1.document_id,sub1.alternative_text,sub1.width,sub1.height,sub1.formats,sub2.related_id FROM files sub1 INNER JOIN files_related_mph sub2 ON sub1.id=sub2.file_id WHERE sub2.related_type='plugin::users-permissions.user' AND sub2.field='avatar') t5 ON t4.id=t5.related_id LEFT JOIN (
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

  async findTrendingPosts(ctx: any) {
    const schema = strapi.contentType("api::post.post");
    const { auth } = ctx.state;
    await validate.query(ctx.query, schema, { auth });
    const { pagination } = ctx.query;

    const page = parseInt(pagination?.page || 1);
    const pageSize = parseInt(pagination?.pageSize || 25);
    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    const totalResult = await strapi.db.connection.raw(
      `SELECT COUNT(t1.id) AS 'total' FROM posts t1 INNER JOIN posts_author_lnk t4 ON t1.id=t4.post_id LEFT JOIN (
        SELECT sub1.id,sub1.document_id,sub1.alternative_text,sub1.width,sub1.height,sub1.formats,sub2.related_id FROM files sub1 INNER JOIN files_related_mph sub2 ON sub1.id=sub2.file_id WHERE sub2.related_type='api::post.post' AND sub2.field='cover') t7 ON t1.id=t7.related_id WHERE t1.published_at IS NOT NULL AND t7.id IS NOT NULL`,
      []
    );

    const total = parseInt(totalResult[0][0].total);
    const pageCount = Math.ceil(total / pageSize);

    const data = await strapi.db.connection.raw(
      `SELECT t1.id,t1.document_id,t1.title,t1.published_at,JSON_OBJECT('id',t5.id,'document_id',t5.document_id,'username',t5.username,'avatar',JSON_OBJECT('id',t6.id,'document_id',t6.document_id,'name',t6.NAME,'alternative_text',t6.alternative_text,'caption',t6.caption,'mime',t6.mime,'width',t6.width,'height',t6.height,'formats',t6.formats)) AS author,JSON_OBJECT('id',t7.id,'document_id',t7.document_id,'name',t7.NAME,'alternative_text',t7.alternative_text,'caption',t7.caption,'mime',t7.mime,'width',t7.width,'height',t7.height,'formats',t7.formats) AS cover,t8.likedByUsers,t9.attachmentExtras FROM posts t1 LEFT JOIN (
        SELECT sub1.post_id,COUNT(sub1.post_id) AS 'likes_total' FROM posts_liked_by_users_lnk sub1 INNER JOIN posts sub2 ON sub1.post_id=sub2.id GROUP BY sub1.post_id) t2 ON t1.id=t2.post_id LEFT JOIN (
        SELECT sub1.post_id,COUNT(sub1.id) AS 'comments_total' FROM comments_post_lnk sub1 INNER JOIN posts sub2 ON sub1.post_id=sub2.id GROUP BY sub1.post_id) t3 ON t1.id=t3.post_id INNER JOIN posts_author_lnk t4 ON t1.id=t4.post_id INNER JOIN up_users t5 ON t4.user_id=t5.id INNER JOIN (
        SELECT sub1.id,sub1.document_id,sub1.NAME,sub1.alternative_text,sub1.caption,sub1.mime,sub1.width,sub1.height,sub1.formats,sub2.related_id FROM files sub1 INNER JOIN files_related_mph sub2 ON sub1.id=sub2.file_id WHERE sub2.related_type='plugin::users-permissions.user' AND sub2.field='avatar') t6 ON t5.id=t6.related_id LEFT JOIN (
        SELECT sub1.id,sub1.document_id,sub1.NAME,sub1.alternative_text,sub1.caption,sub1.mime,sub1.width,sub1.height,sub1.formats,sub2.related_id FROM files sub1 INNER JOIN files_related_mph sub2 ON sub1.id=sub2.file_id WHERE sub2.related_type='api::post.post' AND sub2.field='cover') t7 ON t1.id=t7.related_id LEFT JOIN (
        SELECT sub1.id,JSON_ARRAYAGG(JSON_OBJECT('id',sub2.id,'document_id',sub3.document_id)) AS likedByUsers FROM posts sub1 LEFT JOIN posts_liked_by_users_lnk sub2 ON sub1.id=sub2.post_id LEFT JOIN up_users sub3 ON sub2.user_id=sub3.id GROUP BY sub1.id) t8 ON t1.id=t8.id LEFT JOIN (
        SELECT sub4.entity_id,JSON_ARRAYAGG(JSON_OBJECT('id',sub1.related_id,'attachment',JSON_OBJECT('id',attachment.id,'documentId',attachment.document_id,'name',attachment.NAME,'alternativeText',attachment.alternative_text,'caption',attachment.caption,'width',attachment.width,'height',attachment.height,'formats',attachment.formats,'hash',attachment.HASH,'ext',attachment.ext,'mime',attachment.mime,'size',attachment.size,'url',attachment.url,'previewUrl',attachment.preview_url,'provider',attachment.provider,'provider_metadata',attachment.provider_metadata,'createdAt',attachment.created_at,'updatedAt',attachment.updated_at,'publishedAt',attachment.published_at),'thumbnail',JSON_OBJECT('id',thumbnail.id,'documentId',thumbnail.document_id,'name',thumbnail.NAME,'alternativeText',thumbnail.alternative_text,'caption',thumbnail.caption,'width',thumbnail.width,'height',thumbnail.height,'formats',thumbnail.formats,'hash',thumbnail.HASH,'ext',thumbnail.ext,'mime',thumbnail.mime,'size',thumbnail.size,'url',thumbnail.url,'previewUrl',thumbnail.preview_url,'provider',thumbnail.provider,'provider_metadata',thumbnail.provider_metadata,'createdAt',thumbnail.created_at,'updatedAt',thumbnail.updated_at,'publishedAt',thumbnail.published_at))) AS attachmentExtras FROM (
        SELECT sub1.related_id,sub1.id AS attachment_related_id,sub1.file_id AS attachment_file_id,sub2.id AS thumbnail_related_id,sub2.file_id AS thumbnail_file_id FROM files_related_mph sub1 INNER JOIN files_related_mph sub2 ON sub1.related_id=sub2.related_id AND sub1.related_type='shared.attachment-extra' AND sub1.field='attachment' AND sub2.related_type='shared.attachment-extra' AND sub2.field='thumbnail') sub1 LEFT JOIN files attachment ON sub1.attachment_file_id=attachment.id LEFT JOIN files thumbnail ON sub1.thumbnail_file_id=thumbnail.id LEFT JOIN posts_cmps sub4 ON sub1.related_id=sub4.cmp_id GROUP BY sub4.entity_id) t9 ON t1.id=t9.entity_id WHERE t1.published_at IS NOT NULL AND t7.related_id IS NOT NULL ORDER BY t3.comments_total DESC,t2.likes_total DESC,t1.published_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
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

  async findFollowingPosts(ctx: any) {
    const schema = strapi.contentType("api::post.post");
    const { auth } = ctx.state;
    await validate.query(ctx.query, schema, { auth });
    const { pagination } = ctx.query;

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 25;
    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize, 10);

    const totalResult = await strapi.db.connection.raw(
      `SELECT COUNT(*) as 'total' FROM posts t1`,
      []
    );

    const total = parseInt(totalResult[0][0].total);
    const pageCount = Math.ceil(total / pageSize);

    const data = await strapi.db.connection.raw(`SELECT * FROM posts t1`, [
      limit,
      offset,
    ]);

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

  async findDiscoverPosts(ctx: any) {
    const schema = strapi.contentType("api::post.post");
    const { auth } = ctx.state;
    await validate.query(ctx.query, schema, { auth });
    const { pagination } = ctx.query;

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 25;
    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize, 10);

    const totalResult = await strapi.db.connection.raw(
      `SELECT COUNT(*) as 'total' FROM posts t1`,
      []
    );

    const total = parseInt(totalResult[0][0].total);
    const pageCount = Math.ceil(total / pageSize);

    const data = await strapi.db.connection.raw(`SELECT * FROM posts t1`, [
      limit,
      offset,
    ]);

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
