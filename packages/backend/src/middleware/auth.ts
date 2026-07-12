import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger } from '@/utils/logger';

const logger = createLogger('middleware:auth');

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: 'Missing authorization token',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-in-production') as {
      id: string;
      email: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication failed', error);
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_TOKEN_INVALID',
        message: 'Invalid or expired token',
      },
      timestamp: new Date().toISOString(),
    });
  }
};
