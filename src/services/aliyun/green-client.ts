import { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";
import _ from "lodash";

const Credential = require("@alicloud/credentials");
const OpenApi = require("@alicloud/openapi-client");
const Green20220302 = require("@alicloud/green20220302");
const Util = require("@alicloud/tea-util");

export let client = null;

export const initialize = (strapi: Core.Strapi) => {
  if (!client) {
    const config: any = strapi.config.get("aliyun");

    const credentialsConfig = new Credential.Config({
      type: "access_key",
      accessKeyId: config.key,
      accessKeySecret: config.secret,
    });

    const credential = new Credential.default(credentialsConfig);

    let apiConfig = new OpenApi.Config({
      credential,
    });
    apiConfig.endpoint = config.endpoint;

    client = new Green20220302.default(apiConfig);
  } else {
    strapi.log.warn("Aliyun client is already initialized.");
  }
};

export const ugcModerationByllm = async (content: string) => {
  if (!client) {
    throw new Error("Aliyun client is not initialized.");
  }

  let res = null;
  try {
    let textModerationPlusRequest = new Green20220302.TextModerationPlusRequest(
      {
        service: "ugc_moderation_byllm",
        serviceParameters: JSON.stringify({ content }),
      }
    );

    let runtime = new Util.RuntimeOptions({});

    res = await client.textModerationPlusWithOptions(
      textModerationPlusRequest,
      runtime
    );
    console.log("Aliyun UGC Moderation response: ", res);
  } catch (error) {
    strapi.log.error("Aliyun UGC Moderation failed: ", error);
    throw new errors.ApplicationError("请求内容安全服务异常");
  }

  if (res.statusCode === 200) {
    if (res.body.data.riskLevel !== "none") {
      const description = _.join(
        _.map(res.body.data.result, (item: any) => item.description),
        ","
      );
      throw new errors.ApplicationError(`内容不合规: ${description}`);
    }
  } else {
    throw new errors.ApplicationError("请求内容安全服务异常");
  }

  return res;
};
