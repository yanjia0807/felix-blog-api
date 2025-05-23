import type { Core } from "@strapi/strapi";

export default {
  async afterCreate(event: any) {
    const strapi = global.strapi as Core.Strapi;
    const io = (strapi as any).socketManager.getIO();
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

      io.to(result.receiver.id).emit("message", {
        data: result,
      });

      return result;
    } catch (error) {
      strapi.log.error(error);
    }
  },
};
