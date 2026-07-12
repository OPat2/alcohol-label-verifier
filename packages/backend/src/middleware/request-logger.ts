import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@/utils/logger';

const logger = createLogger('middleware:request-logger');

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (data: any) {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
    return originalSend.call(this, data);
  };

  next();
};
