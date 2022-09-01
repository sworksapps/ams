/* eslint-disable new-cap */
const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');

const logger = new winston.createLogger({
  format: winston.format.json(),
  silent: process.env.NODE_ENV === 'testing',
  transports: [
    new (winston.transports.Console)({
      timestamp: true,
      colorize: true
    }),
  ],
});

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'uat' || 
  process.env.NODE_ENV === 'qa' || process.env.NODE_ENV === 'production') {
  const cloudwatchConfig = {
    awsOptions: {
      credentials: {
        accessKeyId: process.env.CLOUDWATCH_ACCESS_KEY,
        secretAccessKey: process.env.CLOUDWATCH_SECRET_ACCESS_KEY,
      },
      region: process.env.CLOUDWATCH_REGION,
    },
    logGroupName: process.env.CLOUDWATCH_GROUP_NAME,
    //logStreamName: `${process.env.CLOUDWATCH_GROUP_NAME}-${process.env.NODE_ENV}`,
    logStreamName: `${process.env.CLOUDWATCH_GROUP_NAME}-attendence-management`,
    messageFormatter: ({ level, message, additionalInfo }) => `[${level}] : ${message} \nAdditional Info: ${JSON.stringify(additionalInfo)}}`,
  };
  logger.add(new WinstonCloudWatch(cloudwatchConfig));
}
module.exports = logger;
