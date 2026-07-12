import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createLogger } from '@/utils/logger';
import { errorHandler } from '@/middleware/error-handler';
import { requestLogger } from '@/middleware/request-logger';
import { authenticate } from '@/middleware/auth';
import authRoutes from '@/routes/auth.routes';
import labelRoutes from '@/routes/label.routes';
import batchRoutes from '@/routes/batch.routes';
import complianceRoutes from '@/routes/compliance.routes';
import { healthCheck } from '@/controllers/health.controller';

dotenv.config();

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable must be set in production');
}

const logger = createLogger('app');
const app: Express = express();
const PORT = process.env.API_PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(requestLogger);
app.use(limiter);

// Health check (public endpoint)
app.get('/health', healthCheck);

// Public routes with tighter rate limit
app.use('/api/auth', authLimiter, authRoutes);

// Protected routes
app.use('/api/labels', authenticate, labelRoutes);
app.use('/api/batch', authenticate, batchRoutes);
app.use('/api/compliance', authenticate, complianceRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    timestamp: new Date().toISOString(),
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server only when not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

export default app;
