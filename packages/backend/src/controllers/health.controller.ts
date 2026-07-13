import { Response } from 'express';
import { createLogger } from '@/utils/logger';

const logger = createLogger('controllers:health');

export const healthCheck = (_req: any, res: Response) => {
  logger.info('Health check');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
};
