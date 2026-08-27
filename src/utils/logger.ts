import pino from 'pino';
import path from 'path';
import fs from 'fs';

/**
 * Singleton logger instance
 */
export class Logger {
  private static instance: pino.Logger;

  static getInstance(): pino.Logger {
    if (!Logger.instance) {
      const logDir = process.env.LOG_DIR || './logs';

      // Ensure log directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const level = process.env.LOG_LEVEL || 'info';

      Logger.instance = pino(
        {
          level,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              singleLine: false,
            },
          },
        },
        pino.destination(path.join(logDir, 'ravan.log'))
      );
    }

    return Logger.instance;
  }
}

export default Logger.getInstance();
