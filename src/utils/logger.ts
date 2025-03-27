import { createLogger, format, transports } from 'winston';
import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';

// Create a pretty logger with winston
export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../logs/app-log-%DATE%.txt'), // Logs with date in filename
      datePattern: 'YYYY-MM-DD', // Use daily rotation with this date format
      maxFiles: '30d', // Keep logs for the last 30 days
      zippedArchive: true, // Compress old log files into .gz
      handleExceptions: true,
    })
  ]
});