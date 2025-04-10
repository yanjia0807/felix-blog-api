import { sanitize, validate } from "@strapi/utils";
import { yup, validateYupSchema, errors } from "@strapi/utils";
import { Pagination } from "@strapi/utils/dist/pagination";
import _ from "lodash";
import { transformItem } from "../../utils";

const { ApplicationError, ValidationError, ForbiddenError, NotFoundError } =
  errors;

const sanitizeUser = (user, ctx) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel("plugin::users-permissions.user");

  return strapi.contentAPI.sanitize.output(user, userSchema, { auth });
};

const createRegisterSchema = (config) =>
  yup.object({
    email: yup.string().email().required(),
    username: yup.string().required(),
    password: yup
      .string()
      .required()
      .test(async function (value) {
        if (typeof config?.validatePassword === "function") {
          try {
            const isValid = await config.validatePassword(value);
            if (!isValid) {
              return this.createError({
                message: "Password validation failed.",
              });
            }
          } catch (error) {
            return this.createError({
              message: error.message || "An error occurred.",
            });
          }
        }
        return true;
      }),
  });

const validateRegisterBody = (payload, config) =>
  validateYupSchema(createRegisterSchema(config))(payload);

module.exports = (plugin: any) => {
  plugin.routes["content-api"].routes.unshift({
    method: "POST",
    path: "/auth/local/register-otp",
    handler: "custom.registerOtp",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "POST",
    path: "/auth/local/send-otp",
    handler: "custom.sendOtp",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "POST",
    path: "/auth/local/verify-otp",
    handler: "custom.verifyOtp",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "POST",
    path: "/auth/local/reset-password-otp",
    handler: "custom.resetPasswordOtp",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "PUT",
    path: "/users/custom/me",
    handler: "custom.updateMe",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "GET",
    path: "/users/custom",
    handler: "custom.findUsers",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "GET",
    path: "/users/custom/:documentId",
    handler: "custom.findUser",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "GET",
    path: "/users/custom/is-following",
    handler: "custom.findIsFollowing",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "GET",
    path: "/users/custom/followings",
    handler: "custom.findFollowings",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "GET",
    path: "/users/custom/followers",
    handler: "custom.findFollowers",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "PUT",
    path: "/users/custom/followings",
    handler: "custom.updateFollowings",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "GET",
    path: "/users/custom/friends",
    handler: "custom.findFriends",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "GET",
    path: "/users/custom/is-friend",
    handler: "custom.findIsFriend",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.routes["content-api"].routes.unshift({
    method: "PUT",
    path: "/users/custom/cancel-friend",
    handler: "custom.cancelFriend",
    config: {
      middlewares: ["plugin::users-permissions.rateLimit"],
      prefix: "",
    },
  });

  plugin.controllers.custom = {
    registerOtp: async (ctx) => {
      const pluginStore = await strapi.store({
        type: "plugin",
        name: "users-permissions",
      });

      const settings: any = await pluginStore.get({ key: "advanced" });

      if (!settings.allow_register) {
        throw new ApplicationError("Register action is currently disabled");
      }

      const params: any = {
        ...ctx.request.body,
        provider: "local",
      };

      const validations = strapi.config.get(
        "plugin::users-permissions.validationRules"
      );

      await validateRegisterBody(params, validations);

      const role = await strapi.db
        .query("plugin::users-permissions.role")
        .findOne({ where: { type: settings.default_role } });

      if (!role) {
        throw new ApplicationError("Impossible to find the default role");
      }

      const { email, username, provider } = params;

      const identifierFilter = {
        $or: [
          { email: email.toLowerCase() },
          { username: email.toLowerCase() },
          { username },
          { email: username },
        ],
      };

      const conflictingUserCount = await strapi.db
        .query("plugin::users-permissions.user")
        .count({
          where: { ...identifierFilter, provider },
        });

      if (conflictingUserCount > 0) {
        throw new ApplicationError("Email or Username are already taken");
      }

      if (settings.unique_email) {
        const conflictingUserCount = await strapi.db
          .query("plugin::users-permissions.user")
          .count({
            where: { ...identifierFilter },
          });

        if (conflictingUserCount > 0) {
          throw new ApplicationError("Email or Username are already taken");
        }
      }

      const newUser = {
        ...params,
        role: role.id,
        email: email.toLowerCase(),
        username,
        confirmed: false,
      };

      const user = await strapi
        .plugin("users-permissions")
        .service("user")
        .add(newUser);

      const otp = await strapi
        .service("api::otp.otp")
        .createOtp(user.id, "verify-email");
      await strapi.service("api::otp.otp").sendOtp(user, otp);

      const sanitizedUser = await sanitizeUser(user, ctx);
      return ctx.send({ user: sanitizedUser, otp: true });
    },

    sendOtp: async (ctx) => {
      const params: any = {
        ..._.pick(ctx.request.body, ["email", "purpose"]),
        provider: "local",
      };

      const user: any = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: {
            email: params.email,
          },
        });

      if (!user) {
        throw new ValidationError(`User not found`);
      }

      if (user.confirmed && params.purpose === "verify-email") {
        throw new ApplicationError(`Email has already been confirmed`);
      }

      const otp = await strapi
        .service("api::otp.otp")
        .createOtp(user.id, params.purpose);
      await strapi.service("api::otp.otp").sendOtp(user, otp);

      return ctx.send({
        email: params.email,
        status: "sended",
      });
    },

    verifyOtp: async (ctx) => {
      const params: any = {
        ..._.pick(ctx.request.body, ["email", "code", "purpose"]),
        provider: "local",
      };

      const user: any = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: {
            email: params.email,
          },
        });

      if (!user) {
        throw new ValidationError(`User not found`);
      }

      if (user.confirmed && params.purpose === "verify-email") {
        throw new ApplicationError(`Email has already been confirmed`);
      }

      const isValid = await strapi
        .service("api::otp.otp")
        .verifyOtp(params.email, params.code, params.purpose);
      if (!isValid) throw new ValidationError("Code verification failed");

      await strapi
        .plugin("users-permissions")
        .service("user")
        .edit(user.id, { confirmed: true, confirmationToken: null });

      const jwt = await strapi
        .plugin("users-permissions")
        .service("jwt")
        .issue({ id: user.id });

      return ctx.send({
        jwt,
      });
    },

    resetPasswordOtp: async (ctx) => {
      const params: any = {
        ..._.pick(ctx.request.body, [
          "email",
          "code",
          "password",
          "passwordConfirmation",
        ]),
        provider: "local",
      };

      if (params.password !== params.passwordConfirmation) {
        throw new ValidationError("Passwords do not match");
      }

      const user: any = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: {
            email: params.email,
          },
        });

      if (!user) {
        throw new ValidationError(`User not found`);
      }

      const isValid = await strapi
        .service("api::otp.otp")
        .verifyOtp(params.email, params.code, "reset-password");
      if (!isValid) throw new ValidationError("Code verification failed");

      await strapi.plugin("users-permissions").service("user").edit(user.id, {
        resetPasswordToken: null,
        password: params.password,
      });

      ctx.send({
        user: await sanitizeUser(user, ctx),
      });
    },

    updateMe: async (ctx: any) => {
      const contentType = strapi.contentType("plugin::users-permissions.user");
      const query = ctx.query;

      const data: any = {
        ..._.pick(ctx.request.body, [
          "avatar",
          "email",
          "bio",
          "birthday",
          "gender",
          "district",
          "phoneNumber",
        ]),
      };

      const result = await strapi.documents(contentType.uid).update({
        documentId: ctx.state.user.documentId,
        data,
        ...query,
      });

      return result;
    },

    findIsFollowing: async (ctx: any) => {
      const query = ctx.query;

      const user: any = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: ctx.state.user.documentId,
          fields: [],
          populate: {
            followings: {
              fields: [],
            },
          },
        });

      const result = _.some(user.followings, {
        documentId: query.following,
      });

      return { data: result };
    },

    updateFollowings: async (ctx: any) => {
      const params: any = {
        ..._.pick(ctx.request.body, ["following"]),
      };

      const user: any = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: ctx.state.user.documentId,
          populate: {
            followings: true,
          },
        });

      const followingUser = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: params.following,
          fields: [],
        });

      const isFollowed = _.some(user.followings, {
        documentId: params.following,
      });

      const followings = isFollowed
        ? _.filter(
            user.followings,
            (item: any) => item.documentId !== params.following
          )
        : _.concat(user.followings, params.following);

      const isFollowing = !isFollowed;

      const data: any = {
        followings,
      };

      const result = await strapi
        .documents("plugin::users-permissions.user")
        .update({
          documentId: ctx.state.user.documentId,
          data,
          populate: {
            avatar: {
              fields: ["formats", "name", "alternativeText"],
            },
            district: true,
            followers: {
              count: true,
            },
            followings: {
              count: true,
            },
            posts: {
              count: true,
            },
          },
        });

      const notificationParams = {
        type: "following" as any,
        user: params.following,
        data: JSON.stringify({
          follower: {
            id: result.id,
            documentId: result.documentId,
            username: result.username,
            avatar: result.avatar,
            gender: result.gender,
            birthday: result.birthday,
            district: result.district,
          },
          isFollowing,
        }),
      };

      const notification = await strapi
        .documents("api::notification.notification")
        .create({
          data: notificationParams,
        });

      (strapi as any).io.to(followingUser.id).emit("notification:create", {
        data: notification,
      });

      return data;
    },

    findUsers: async (ctx: any) => {
      const contentType = strapi.contentType("plugin::users-permissions.user");
      const query: any = ctx.query;
      const { filters, pagination: queryPagination } = query;
      const page = queryPagination?.page || 1;
      const pageSize = queryPagination?.pageSize || 25;
      const pagination: Pagination = {
        start: (page - 1) * pageSize,
        limit: pageSize,
      };

      const [data, total]: any = await Promise.all([
        strapi.documents(contentType.uid).findMany({ ...query, pagination }),
        strapi.documents(contentType.uid).count({ filters }),
      ]);

      const pageCount = Math.ceil(total / pageSize);

      ctx.body = {
        data,
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

    findUser: async (ctx: any) => {
      const contentType = strapi.contentType("plugin::users-permissions.user");
      const { documentId } = ctx.params;
      const query = ctx.query;

      const data = await strapi.documents(contentType.uid).findOne({
        documentId,
        ...query,
      });

      return data;
    },

    findFollowings: async (ctx: any) => {
      const contentType = strapi.contentType("plugin::users-permissions.user");
      const {
        filters: { keyword, userDocumentId },
        populate,
        pagination,
      } = ctx.query;

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const limit = pageSize;

      const user: any = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: userDocumentId,
          fields: [],
          populate: {
            followings: {
              fields: [],
            },
          },
        });

      const filters: any = {
        documentId: {
          $in: _.map(user.followings, (item: any) => item.documentId),
        },
      };

      if (keyword) {
        filters["$or"] = [
          {
            username: {
              $containsi: keyword,
            },
          },
          {
            email: {
              $containsi: keyword,
            },
          },
        ];
      }

      const [data, total]: any = await Promise.all([
        strapi.documents(contentType.uid).findMany({
          pagination: {
            start,
            limit,
          },
          populate,
          filters,
        }),
        strapi.documents(contentType.uid).count({ filters }),
      ]);
      const pageCount = Math.ceil(total / pageSize);

      return {
        data,
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

    findFollowers: async (ctx: any) => {
      const contentType = strapi.contentType("plugin::users-permissions.user");
      const {
        filters: { keyword, userDocumentId },
        populate,
        pagination,
      } = ctx.query;

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const limit = pageSize;

      const user: any = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: userDocumentId,
          fields: [],
          populate: {
            followers: {
              fields: [],
            },
          },
        });

      const filters: any = {
        documentId: {
          $in: _.map(user.followers, (item: any) => item.documentId),
        },
      };
      if (keyword) {
        filters["$or"] = [
          {
            username: {
              $containsi: keyword,
            },
          },
          {
            email: {
              $containsi: keyword,
            },
          },
        ];
      }

      const [data, total]: any = await Promise.all([
        strapi.documents(contentType.uid).findMany({
          pagination: {
            start,
            limit,
          },
          populate,
          filters,
        }),
        strapi.documents(contentType.uid).count({ filters }),
      ]);
      const pageCount = Math.ceil(total / pageSize);

      return {
        data,
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

    findFriends: async (ctx: any) => {
      const pagination = ctx.query.pagination;
      const userId = ctx.state.user.id;

      const page = pagination?.page ? parseInt(pagination?.page) : 1;
      const pageSize = pagination?.pageSize
        ? parseInt(pagination?.pageSize)
        : 20;
      const offset = (page - 1) * pageSize;
      const limit = pageSize;

      const totalResult = await strapi.db.connection.raw(
        `SELECT COUNT(*) FROM up_users_friends_lnk t1 LEFT JOIN up_users t2 ON t1.inv_user_id=t2.id WHERE t1.user_id=?`,
        [userId]
      );

      const data = await strapi.db.connection.raw(
        `SELECT t2.id,t2.document_id,t2.username,t3.id AS 'avatar:id',t3.document_id AS 'avatar:document_id',t3.alternative_text AS 'avatar:alternative_text',t3.width AS 'avatar:width',t3.height AS 'avatar:height',t3.formats AS 'avatar:formats',CASE WHEN t4.id IS NULL THEN 0 ELSE 1 END AS 'is_online' FROM up_users_friends_lnk t1 LEFT JOIN up_users t2 ON t1.inv_user_id=t2.id LEFT JOIN (
SELECT sub1.id,sub1.document_id,sub1.alternative_text,sub1.width,sub1.height,sub1.formats,sub2.related_id FROM files sub1 INNER JOIN files_related_mph sub2 ON sub1.id=sub2.file_id WHERE sub2.related_type='plugin::users-permissions.user' AND sub2.field="avatar") t3 ON t3.related_id=t2.id LEFT JOIN online_users_user_lnk t4 ON t2.id=t4.user_id WHERE t1.user_id=? LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      const total = parseInt(totalResult[0][0].total);
      const pageCount = Math.ceil(total / pageSize);
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

    findIsFriend: async (ctx: any) => {
      const user: any = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: ctx.state.user.documentId,
          fields: [],
          populate: {
            friends: {
              fields: [],
            },
          },
        });

      const result = _.some(user.friends, {
        documentId: ctx.query.userDocumentId,
      });

      return { data: result };
    },

    cancelFriend: async (ctx: any) => {
      const friendUserDocumentId = ctx.request.body.data.userDocumentId;
      const currentUserDocumentId = ctx.state.user.documentId;

      let currentUser: any = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: currentUserDocumentId,
          fields: [],
          populate: {
            friends: {
              fields: [],
            },
          },
        });

      currentUser = await strapi
        .documents("plugin::users-permissions.user")
        .update({
          documentId: currentUserDocumentId,
          data: {
            friends: _.filter(
              currentUser.friends,
              (item: any) => item.documentId !== friendUserDocumentId
            ),
          },
          populate: {
            avatar: true,
            district: true,
          },
        });

      let friendUser = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: friendUserDocumentId,
          fields: [],
          populate: {
            friends: {
              fields: [],
            },
          },
        });

      friendUser = await strapi
        .documents("plugin::users-permissions.user")
        .update({
          documentId: friendUserDocumentId,
          data: {
            friends: _.filter(
              friendUser.friends,
              (item: any) => item.documentId !== currentUserDocumentId
            ),
          },
        });

      const notification = await strapi
        .documents("api::notification.notification")
        .create({
          data: {
            type: "friend-cancel" as any,
            user: friendUser.id,
            data: JSON.stringify({
              user: {
                id: currentUser.id,
                documentId: currentUser.documentId,
                username: currentUser.username,
                avatar: currentUser.avatar,
                gender: currentUser.gender,
                birthday: currentUser.birthday,
                district: currentUser.district,
              },
            }),
          },
        });

      (strapi as any).io.to(friendUser.id).emit("friend:cancel", {
        data: {
          id: friendUser.id,
          documentId: friendUser.documentId,
        },
      });

      (strapi as any).io.to(friendUser.id).emit("notification:create", {
        data: notification,
      });

      return { data: currentUser };
    },
  };

  return plugin;
};
