export default ({ env }) => ({
  key: env("ALIBABA_CLOUD_ACCESS_KEY_ID", ""),
  secret: env("ALIBABA_CLOUD_ACCESS_KEY_SECRET", ""),
  endpoint: env("ALIBABA_CLOUD_GREEN_CIP", ""),
});
