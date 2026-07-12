import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@/utils/logger';

const logger = createLogger('middleware:error-handler');

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  logger.error({
    code,
    message: err.message,
    statusCode,
    stack: err.stack,
    path: req.path,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message || 'Internal server error',
    },
    timestamp: new Date().toISOString(),
  });
};
