import pino from 'pino';

const transport = pino.transport({
  target: process.env.LOG_FORMAT === 'json' ? 'pino/file' : 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
});

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  transport,
);

export const createLogger = (name: string) => {
  return logger.child({ context: name });
};
