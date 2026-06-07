const { createLogger, format, transports } = require("winston");
const path = require("path");
const fs = require("fs");

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console transport with colors in dev
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: "HH:mm:ss" }),
        errors({ stack: true }),
        logFormat
      ),
    }),
    // File transport for errors
    new transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
    }),
    // File transport for all logs
    new transports.File({
      filename: path.join(logsDir, "combined.log"),
    }),
  ],
  exitOnError: false,
});

module.exports = logger;
