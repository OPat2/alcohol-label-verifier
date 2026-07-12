import { Router, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { createLogger } from '@/utils/logger';
import { AuthRequest } from '@/middleware/auth';
import { GOVERNMENT_WARNING_TEXT } from '@label-verifier/shared';

const router = Router();
const logger = createLogger('routes:compliance');

/**
 * GET /api/compliance/warning-text
 * Returns the canonical government warning text
 */
router.get('/warning-text', async (_req: AuthRequest, res: Response) => {
  return sendSuccess(res, {
    warningText: GOVERNMENT_WARNING_TEXT,
    requirements: {
      headerFormat: 'GOVERNMENT WARNING: (all caps, followed by colon)',
      clause1: 'Must include Surgeon General pregnancy/birth defects language',
      clause2: 'Must include impaired driving/health problems language',
    },
  });
});

/**
 * GET /api/compliance/ttb-fields
 * Returns required fields per beverage type
 */
router.get('/ttb-fields', async (_req: AuthRequest, res: Response) => {
  return sendSuccess(res, {
    spirits: ['brandName', 'classType', 'abv', 'netContents', 'governmentWarning', 'bottlerName'],
    wine: ['brandName', 'abv', 'netContents', 'governmentWarning', 'bottlerName'],
    beer: ['brandName', 'abv', 'netContents', 'governmentWarning', 'bottlerName'],
    malt: ['brandName', 'abv', 'netContents', 'governmentWarning', 'bottlerName'],
  });
});

/**
 * GET /api/compliance/report
 * Placeholder for aggregate compliance report
 */
router.get('/report', async (req: AuthRequest, res: Response) => {
  try {
    logger.info(`Compliance report requested by ${req.user?.id}`);
    return sendSuccess(res, {
      message: 'Compliance report endpoint ready',
      reportedAt: new Date().toISOString(),
      generatedFor: req.user?.id,
    });
  } catch (error) {
    logger.error('Report generation failed', error);
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

export default router;
