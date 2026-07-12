import { Response } from 'express';
import { createLogger } from '@/utils/logger';

const logger = createLogger('controllers:health');

export const healthCheck = (_req: any, res: Response) => {
  logger.info('Health check');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};
