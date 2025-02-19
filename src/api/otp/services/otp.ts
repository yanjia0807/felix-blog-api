/**
 * otp service
 */

import { factories } from "@strapi/strapi";
import { isAfter, parseISO } from "date-fns";
import { addMinutes } from "date-fns";
import { randomInt } from "crypto";
import { errors } from "@strapi/utils";

const { ApplicationError, ValidationError, ForbiddenError, NotFoundError } =
  errors;

export default factories.createCoreService("api::otp.otp", {
  async createOtp(userId, purpose) {
    const now = new Date(new Date().toISOString());
    const expiresAt = addMinutes(now, 30);
    const code = randomInt(10000).toString().padStart(4, "0");

    const otp = await strapi.documents("api::otp.otp").create({
      data: {
        code,
        expiresAt,
        user: userId,
        purpose,
      },
    });

    return otp;
  },

  async sendOtp(user, otp) {
    const subject = "felix blog 验证码";
    let text = `亲爱的 ${user.username}，您的验证码是：${otp.code}。felix blog 团队。`;

    try {
      await strapi.plugin("email").service("email").send({
        to: user.email,
        subject,
        text,
      });
    } catch (err) {
      strapi.log.error(err);
      throw new ApplicationError("Error sending otp email");
    }
  },

  async verifyOtp(email, code, purpose) {
    const otp = await strapi.db.query("api::otp.otp").findOne({
      where: {
        code: { $eq: code },
        user: { email: { $eq: email } },
        purpose: { $eq: purpose },
      },
    });
    if (!otp) return false;
    const now = new Date();

    if (!isAfter(parseISO(otp.expiresAt), now)) {
      return false;
    }

    if (purpose !== "reset-password") {
      await strapi
        .documents("api::otp.otp")
        .delete({ documentId: otp.documentId });
    }

    return true;
  },
});
