import { Core } from "@strapi/strapi";
import Expo, { ExpoPushMessage } from "expo-server-sdk";
import { redis } from "../redis";

let expo: Expo | null = null;

const TICKET_PRIFIX = "expo:tickets:";
const CHECK_RECEIPT_TASK_ID = "expo-receipts-check";

export const initialize = (strapi: Core.Strapi) => {
  const config: any = strapi.config.get("expo");
  const checkReceiptRule: string = config.checkReceiptRule || "*/1 * * * *";

  const checkReceipts = async () => {
    try {
      const ticketKeys = await redis.keys(`${TICKET_PRIFIX}*`);
      const receiptIds = ticketKeys.map((k) => k.replace(TICKET_PRIFIX, ""));
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
      const ticketKey = `${TICKET_PRIFIX}${receiptId}`;

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
          enabled: false,
        },
      });
    }
  };

  if (!expo) {
    expo = new Expo();

    strapi.cron.add({
      [CHECK_RECEIPT_TASK_ID]: {
        task: async ({ strapi }) => {
          await checkReceipts();
        },
        options: {
          rule: checkReceiptRule,
        },
      },
    });
  }
};

export const getExpoUtils = (strapi: Core.Strapi) => {
  if (!expo) {
    throw new Error("expo is not initialized")
  }

  const config: any = strapi.config.get("expo");
  const ticketStaleTime = config.ticketStaleTime || 86400;

  const sendToUser = async (documentId: string, pushMessage: any) => {
    const expoPushTokens = await strapi
      .documents("api::expo-push-token.expo-push-token")
      .findMany({
        filters: { user: { documentId } },
      });

    if (expoPushTokens.length === 0) {
      strapi.log.info(`No Expo tokens for user ${documentId}`);
      return;
    }

    const messages = expoPushTokens
      .filter((item) => Expo.isExpoPushToken(item.token) && item.enabled)
      .map((item) => ({ to: item.token, ...pushMessage }));

    return sendBatch(messages);
  };

  const sendBatch = async (messages: ExpoPushMessage[]) => {
    const chunks = expo.chunkPushNotifications(messages);

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
            `${TICKET_PRIFIX}${ticket.id}`,
            JSON.stringify({ ticket, timestamp: Date.now() }),
            "EX",
            ttl
          );
        })
    );
  };

  return {
    sendToUser,
  };
};
