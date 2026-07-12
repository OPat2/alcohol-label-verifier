import { Router, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { createLogger } from '@/utils/logger';
import jwt from 'jsonwebtoken';
import { LoginRequest, LoginResponse } from '@label-verifier/shared';

const router = Router();
const logger = createLogger('routes:auth');

router.post('/login', async (req: any, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return sendError(res, 'VALIDATION_FAILED', 'Email and password required', 400);
    }

    // Mock user for demo prototype
    const mockUser = {
      id: 'user-123',
      email: 'agent@ttb.gov',
      name: 'TTB Agent',
      role: 'agent' as const,
      organizationId: 'org-123',
      createdAt: new Date().toISOString(),
    };

    const secret = process.env.JWT_SECRET || 'secret';
    // Cast to any to avoid strict StringValue type in newer @types/jsonwebtoken
    const options = { expiresIn: process.env.JWT_EXPIRY || '24h' } as Parameters<typeof jwt.sign>[2];
    const token = jwt.sign(
      { id: mockUser.id, email: mockUser.email, role: mockUser.role },
      secret,
      options,
    );

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
