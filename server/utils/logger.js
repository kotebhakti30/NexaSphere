/**
 * Winston Logger Configuration
 * Structured logging for all backend operations
 */

import winston from "winston";
import path from "path";
import DailyRotateFile from "winston-daily-rotate-file";

// Create logs directory if it doesn't exist
import fs from "fs";
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for console output
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...args } = info;

    const ts = timestamp.slice(0, 19).replace("T", " ");

    return `${ts} [${level}]: ${message} ${
      Object.keys(args).length ? JSON.stringify(args, null, 2) : ""
    }`;
  })
);

// Determine runtime levels: Console is dynamic, historical files maintain info baseline
const consoleLevel = process.env.LOG_LEVEL || "info";
const fileBaselineLevel = "info";

// Ensure the root gatekeeper allows debug logs through if requested, otherwise defaults to info
const globalGatekeeperLevel = consoleLevel === "debug" ? "debug" : fileBaselineLevel;

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: consoleLevel, // <-- Add this line
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      format
    ),
  }),

  // Error logs
  new winston.transports.File({
    filename: path.join(logsDir, "error.log"),
    level: "error",
    format: winston.format.uncolorize(),
  }),

  new winston.transports.File({
    filename: path.join(logsDir, "combined.log"),
    level: fileBaselineLevel, // <-- Add this line
    format: winston.format.uncolorize(),
  }),

  // Daily rotate logs (requires winston-daily-rotate-file)
  new DailyRotateFile({
    filename: path.join(logsDir, "application-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: fileBaselineLevel, // <-- Add this line
    maxSize: "20m",
    maxFiles: "14d",
    format: winston.format.uncolorize(),
    utc: true,
  }),
];

// Create logger instance
// Create logger instance
const logger = winston.createLogger({
  level: globalGatekeeperLevel, // <-- Change this line
  levels,
  format,
  transports,
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, "exceptions-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      format: winston.format.uncolorize(),
      utc: true,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, "rejections-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      format: winston.format.uncolorize(),
      utc: true,
    }),
  ],
});

export default logger;
