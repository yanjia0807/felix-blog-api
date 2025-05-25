import type { Core } from "@strapi/strapi";
import { io, getIoUtils } from "../../../../services/socket";
import { getExpoUtils } from "../../../../services/expo";

export default {
  async afterCreate(event: any) {
    const strapi = global.strapi as Core.Strapi;
    const expoUtils = getExpoUtils(strapi);
    const ioUtils = getIoUtils(strapi);

    const { result } = event;
    const chatDocumentId = result.chat.documentId;
    const receiverDocumentId = result.receiver.documentId;

    try {
      await strapi.documents("api::chat.chat").update({
        documentId: chatDocumentId,
        data: {
          lastMessage: result.documentId,
        },
      });

      const chatStatus = await strapi
        .documents("api::chat-status.chat-status")
        .findFirst({
          filters: {
            chat: {
              documentId: chatDocumentId,
            },
            user: {
              documentId: receiverDocumentId,
            },
          },
        });

      await strapi.documents("api::chat-status.chat-status").update({
        documentId: chatStatus.documentId,
        data: { unreadCount: chatStatus.unreadCount + 1 },
      });

      // if (await ioUtils.isUserOnline(result.receiver.documentId)) {
      //   io.to(result.receiver.documentId).emit("message", {
      //     data: result,
      //   });
      // } else {
        await expoUtils.sendToUser(result.receiver.documentId, {
          title: result.sender.username,
          body: result.content,
          data: {
            type: "chat",
            chatId: chatDocumentId,
            messageId: result.documentId,
          },
        });
      // }

      return result;
    } catch (error) {
      strapi.log.error(error);
    }
  },
};
