const { sanitize, validate } = strapi.contentAPI;
import { yup, validateYupSchema, errors } from "@strapi/utils";

import _ from "lodash";

const modelId = "plugin::users-permissions.user";
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
    path: "/users/custom/is-following-user",
    handler: "custom.isFollowingUser",
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
      const schema = strapi.contentType(modelId);
      const { auth } = ctx.state;
      await validate.query(ctx.query, schema, { auth });

      const sanitizedQueryParams = await sanitize.query(ctx.query, schema, {
        auth,
      });

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

      const userData = await strapi
        .documents("plugin::users-permissions.user")
        .update({
          documentId: ctx.state.user.documentId,
          data,
          ...sanitizedQueryParams,
        });

      const sanitizeUserData: any = await sanitize.output(userData, schema, {
        auth,
      });

      const result = {
        ...sanitizeUserData,
      };

      return result;
    },

    isFollowingUser: async (ctx: any) => {
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
      const isFollowing = _.some(user.followings, {
        documentId: ctx.query.following,
      });
      return {
        data: isFollowing,
      };
    },

    updateFollowings: async (ctx: any) => {
      const schema = strapi.contentType(modelId);
      const { auth } = ctx.state;
      await validate.query(ctx.query, schema, { auth });

      const sanitizedQueryParams = await sanitize.query(ctx.query, schema, {
        auth,
      });

      const user: any = await strapi
        .documents("plugin::users-permissions.user")
        .findOne({
          documentId: ctx.state.user.documentId,
          fields: [],
          populate: {
            followings: {
              fields: [],
            },
            avatar: true,
          },
        });

      const params: any = {
        ..._.pick(ctx.request.body, ["following"]),
      };

      const isFollowingBefore = _.some(user.followings, {
        documentId: params.following,
      });

      const followings = isFollowingBefore
        ? _.filter(
            user.followings,
            (item: any) => item.documentId !== params.following
          )
        : _.concat(user.followings, params.following);

      const isFollowing = !isFollowingBefore;

      const data: any = {
        followings,
      };

      const userData = await strapi
        .documents("plugin::users-permissions.user")
        .update({
          documentId: ctx.state.user.documentId,
          data,
          ...sanitizedQueryParams,
        });

      const sanitizeUserData: any = await sanitize.output(userData, schema, {
        auth,
      });

      const notificationParams = {
        type: "following" as any,
        user: params.following,
        data: JSON.stringify({
          follower: {
            id: user.id,
            documentId: user.documentId,
            username: user.username,
            avatar: user.avatar && {
              formats: {
                thumbnail: user.avatar.formats.thumbnail,
              },
            },
            bio: user.bio,
          },
          isFollowing,
        }),
      };

      const notification = await strapi
        .documents("api::notification.notification")
        .create({
          data: notificationParams,
        });

      (strapi as any).io.to(params.following).emit("notification:create", {
        data: notification,
      });

      const result = {
        data: {
          ...sanitizeUserData,
        },
      };

      return result;
    },

    findUsers: async (ctx: any) => {
      const schema = strapi.getModel(modelId);
      const { auth } = ctx.state;
      await validate.query(ctx.query, schema, { auth });

      let sanitizedQueryParams = await sanitize.query(ctx.query, schema, {
        auth,
      });

      sanitizedQueryParams = {
        ...sanitizedQueryParams,
        ...(sanitizedQueryParams.pagination as Record<string, unknown>),
      };

      const { results, pagination } = await strapi.entityService.findPage(
        modelId,
        sanitizedQueryParams
      );

      const users = await Promise.all(
        results.map((user) => sanitize.output(user, schema, { auth }))
      );

      ctx.body = {
        data: users,
        meta: {
          pagination: pagination,
        },
      };
    },

    findUser: async (ctx: any) => {
      const schema = strapi.contentType(modelId);
      const { auth } = ctx.state;
      const { documentId } = ctx.params;
      await validate.query(ctx.query, schema, { auth });

      const sanitizedQueryParams = await sanitize.query(ctx.query, schema, {
        auth,
      });

      const userData = await strapi.documents(schema.uid).findOne({
        documentId,
        ...sanitizedQueryParams,
      });

      const sanitizeUserData: any = await sanitize.output(userData, schema, {
        auth,
      });

      const result = {
        ...sanitizeUserData,
      };

      return result;
    },

    findFollowings: async (ctx: any) => {
      const {
        filters: { keyword, documentId },
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
          documentId,
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
        strapi.documents(modelId).findMany({
          pagination: {
            start,
            limit,
          },
          populate,
          filters,
        }),
        strapi.documents(modelId).count({ filters }),
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
      const {
        filters: { keyword, documentId },
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
          documentId,
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
        strapi.documents(modelId).findMany({
          pagination: {
            start,
            limit,
          },
          populate,
          filters,
        }),
        strapi.documents(modelId).count({ filters }),
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
  };

  return plugin;
};
