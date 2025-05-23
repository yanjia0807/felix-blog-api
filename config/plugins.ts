export default ({ env }) => ({
  email: {
    config: {
      provider: "nodemailer",
      providerOptions: {
        host: env("SMTP_HOST"),
        port: env("SMTP_PORT"),
        secure: true,
        auth: {
          user: env("SMTP_USER"),
          pass: env("SMTP_PASS"),
        },
      },
      settings: {
        defaultFrom: env("SMTP_USER"),
        defaultReplyTo: env("SMTP_USER"),
      },
    },
  },
  redis: {
    config: {
      settings: {
        debug: false,
        enableRedlock: true,
      },
      connections: {
        default: {
          connection: {
            host: env("REDIS_HOST", "localhost"),
            port: env("REDIS_PORT", 6379),
            username: env("REDIS_USERNAME", ""),
            password: env("REDIS_PASSWORD", ""),
          },
          settings: {
            debug: false,
          },
        },
      },
    },
  },
});
