import { Router, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { createLogger } from '@/utils/logger';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { LoginRequest, LoginResponse } from '@shared/types';

const router = Router();
const logger = createLogger('routes:auth');

router.post('/login', async (req: any, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return sendError(res, 'VALIDATION_FAILED', 'Email and password required', 400);
    }

    // Mock user for demo
    const mockUser = {
      id: 'user-123',
      email: 'agent@ttb.gov',
      name: 'TTB Agent',
      role: 'agent',
      organizationId: 'org-123',
    };

    const token = jwt.sign(mockUser, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRY || '24h',
    });

    const response: LoginResponse = {
      token,
      user: mockUser,
    };

    logger.info(`User logged in: ${email}`);
    return sendSuccess(res, response);
  } catch (error) {
    logger.error('Login failed', error);
    return sendError(res, 'LOGIN_FAILED', (error as Error).message, 500);
  }
});

export default router;
