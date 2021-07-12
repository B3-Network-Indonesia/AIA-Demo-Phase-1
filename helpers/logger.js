const { format, createLogger, transports } = require("winston");
const { combine, timestamp, printf } = format;

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

module.exports = createLogger({
  level: "info",
  format: combine(timestamp(), myFormat),
  transports: [
    new transports.File({ filename: "logs/error.log", level: "error" }),
  ],
});
