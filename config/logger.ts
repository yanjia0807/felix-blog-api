'use strict';

const {
  winston,
  formats: { prettyPrint, levelFilter },
} = require('@strapi/logger');

export default ({ env }) => ({
  transports: [
    new winston.transports.Console({
      level: 'debug',
      timestamp: true,
      prettyPrint: env('NODE_ENV') === 'development',
    }),
  ],
});