import type { Core } from "@strapi/strapi";

export default {
  async afterCreate(event: any) {
    const strapi = global.strapi as Core.Strapi;
    const socketManager = (strapi as any).socketManager
    const io = socketManager.getIO();
    const expoManager = (strapi as any).expo;
    
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

      if (socketManager.isUserOnline(result.receiver.id)) {
        io.to(result.receiver.id).emit("message", {
          data: result,
        });
      } else {
        await expoManager.sendToUser(result.receiver.id, {
          title: result.sender.username,
          body: result.content,
          data: {
            type: "chat",
            chatId: chatDocumentId,
            messageId: result.documentId,
          },
        })
      }

      return result;
    } catch (error) {
      strapi.log.error(error);
    }
  },
};
