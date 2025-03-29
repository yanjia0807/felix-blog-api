/**
 * friendship service
 */

import { factories } from "@strapi/strapi";
import { errors } from "@strapi/utils";

export default factories.createCoreService("api::friendship.friendship", {
  async create(params: any) {
    const {
      data: { requester, recipient },
    } = params;

    const friendship = await strapi
      .documents("api::friendship.friendship")
      .findFirst({
        filters: {
          $or: [
            {
              requester: {
                documentId: requester,
              },
              recipient: {
                documentId: recipient,
              },
              state: "accepted",
            },
            {
              requester: {
                documentId: recipient,
              },
              recipient: {
                documentId: requester,
              },
              state: "accepted",
            },
          ],
        },
      });

    if (friendship) {
      throw new errors.ValidationError("data is already existed");
    }

    const result = await super.create({
      data: params.data,
      populate: {
        requester: {
          populate: {
            avatar: true,
          },
        },
        recipient: true,
      },
    });

    const notificationParams = {
      type: "friendship" as any,
      user: result.recipient.id,
      data: JSON.stringify({
        documentId: result.documentId,
        requester: {
          id: result.requester.id,
          documentId: result.requester.documentId,
          username: result.requester.username,
          avatar: result.requester.avatar,
          gender: result.requester.gender,
          birthday: result.requester.birthday,
          district: result.requester.district,
        },
      }),
    };

    const notification = await strapi
      .documents("api::notification.notification")
      .create({
        data: notificationParams,
      });

    (strapi as any).io.to(result.recipient.id).emit("notification:create", {
      data: notification,
    });

    return result;
  },

  async update(documentId, params) {
    const {
      data: { state, notificationId },
    } = params;

    const result = await super.update(documentId, {
      data: {
        state: state as any,
      },
      populate: {
        recipient: {
          populate: {
            avatar: true,
          },
        },
        requester: true,
      },
    });

    console.log("@@@@", result)

    await strapi.documents("api::notification.notification").update({
      documentId: notificationId as any,
      data: {
        feedback: JSON.stringify({ state }),
      },
    });

    const notificationParams = {
      type: "friendship-feedback" as any,
      user: result.requester.id,
      data: JSON.stringify({
        documentId: result.documentId,
        recipient: {
          id: result.recipient.id,
          documentId: result.recipient.documentId,
          username: result.recipient.username,
          avatar: result.recipient.avatar,
          gender: result.recipient.gender,
          birthday: result.recipient.birthday,
          district: result.recipient.district,
        },
        state,
      }),
    };

    const notification = await strapi
      .documents("api::notification.notification")
      .create({
        data: notificationParams,
      });

    (strapi as any).io.to(result.requester.id).emit("notification:create", {
      data: notification,
    });

    return result;
  },
});
