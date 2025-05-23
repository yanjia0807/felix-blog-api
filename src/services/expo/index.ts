import { Core } from "@strapi/strapi";
import Expo, { ExpoPushMessage } from "expo-server-sdk";
import { createRedisClient } from "../redis";

const TICKET_PREFIX = "expo:tickets:";

interface ExpoManager {
  initialize: () => void;
  sendToUser: (userId: string, pushMessage: any) => Promise<void>;
}

export const createExpoManager = (strapi: Core.Strapi): ExpoManager => {
  const expo = new Expo();
  const redis = createRedisClient(strapi);
  const config: any = strapi.config.get("expo");
  const cronTaskId = "expo-receipts-check";

  const initialize = () => {
    const cronRule: string = config.checkRule || "*/1 * * * *";

    strapi.cron.add({
      [cronTaskId]: {
        task: async ({ strapi }) => {
          await checkReceipts();
        },
        options: {
          rule: cronRule,
        },
      },
    });
  };

  const sendToUser = async (userId: string, pushMessage: any) => {
    const expoPushTokens = await strapi
      .documents("api::expo-push-token.expo-push-token")
      .findMany({
        filters: { user: { id: userId } },
      });

    if (expoPushTokens.length === 0) {
      strapi.log.info(`No Expo tokens for user ${userId}`);
      return;
    }

    const messages = expoPushTokens
      .filter((item) => Expo.isExpoPushToken(item.token) && item.enabled)
      .map((item) => ({ to: item.token, ...pushMessage }));

    return sendBatch(messages);
  };

  const sendBatch = async (messages: ExpoPushMessage[]) => {
    const chunks = expo.chunkPushNotifications(messages);
    const ticketStaleTime = config.ticketStaleTime || 86400;

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        await storeTickets(tickets, ticketStaleTime);
      } catch (error) {
        strapi.log.error(`Push notification failed: ${error}`);
      }
    }
  };

  const storeTickets = async (tickets: any[], ttl: number) => {
    await Promise.all(
      tickets
        .filter((ticket) => ticket.status === "ok")
        .map(async (ticket) => {
          await redis.set(
            `${TICKET_PREFIX}${ticket.id}`,
            JSON.stringify({ ticket, timestamp: Date.now() }),
            "EX",
            ttl
          );
        })
    );
  };

  const checkReceipts = async () => {
    try {
      const ticketKeys = await redis.keys(`${TICKET_PREFIX}*`);
      const receiptIds = ticketKeys.map((k) => k.replace(TICKET_PREFIX, ""));
      const chunks = expo.chunkPushNotificationReceiptIds(receiptIds);

      for (const chunk of chunks) {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        handleReceipts(receipts);
      }
    } catch (error) {
      strapi.log.error("Receipt check failed", error);
    }
  };

  const handleReceipts = async (receipts: Record<string, any>) => {
    for (const [receiptId, receipt] of Object.entries(receipts)) {
      const ticketKey = `${TICKET_PREFIX}${receiptId}`;

      try {
        if (receipt.status === "ok") {
          await redis.del(ticketKey);
        } else if (receipt.status === "error") {
          await handleErrorReceipt(receiptId, receipt);
          await redis.del(ticketKey);
        }
      } catch (error) {
        strapi.log.error(`Receipt handling failed: ${receiptId}`, error);
      }
    }
  };

  const handleErrorReceipt = async (receiptId: string, receipt: any) => {
    if (receipt.details?.error === "DeviceNotRegistered") {
      await invalidateToken(receiptId);
    }
    strapi.log.error(`Push error ${receipt.details?.error}: ${receiptId}`);
  };

  const invalidateToken = async (token: string) => {
    const record = await strapi
      .documents("api::expo-push-token.expo-push-token")
      .findFirst({ filters: { token } });

    if (record) {
      await strapi.documents("api::expo-push-token.expo-push-token").update({
        documentId: record.documentId,
        data: {
          enabled: false
        }
      });
    }
  };

  return {
    initialize,
    sendToUser,
  };
};
