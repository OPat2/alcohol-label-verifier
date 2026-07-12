import pino from 'pino';

const isTest = process.env.NODE_ENV === 'test';

let logger: pino.Logger;

if (isTest) {
  // Silent logger for tests
  logger = pino({ level: 'silent' });
} else if (process.env.LOG_FORMAT !== 'json') {
  try {
    const transport = pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    });
    logger = pino({ level: process.env.LOG_LEVEL || 'info' }, transport);
  } catch {
    logger = pino({ level: process.env.LOG_LEVEL || 'info' });
  }
} else {
  logger = pino({ level: process.env.LOG_LEVEL || 'info' });
}

export const createLogger = (name: string) => {
  return logger.child({ context: name });
};
