import { Router, Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { sendSuccess, sendError } from '@/utils/response';
import { createLogger } from '@/utils/logger';
import multer from 'multer';
import { extractLabelText, preprocessImage } from '@/services/vision.service';
import { validateLabel } from '@/services/validator.service';
import { VerificationResult, ApplicationData } from '@shared/types';
import { v4 as uuid } from 'uuid';

const router = Router();
const logger = createLogger('routes:labels');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/verify', upload.single('labelImage'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return sendError(res, 'FILE_MISSING', 'No image file provided', 400);
    }

    if (!req.body.applicationData) {
      return sendError(res, 'VALIDATION_FAILED', 'Application data required', 400);
    }

    const applicationData: ApplicationData = JSON.parse(req.body.applicationData);

    // Preprocess image
    const processedImage = await preprocessImage(req.file.buffer);

    // Extract text from image
    const extracted = await extractLabelText(processedImage);

    // Validate label against application data
    const { comparisons, overallConfidence } = validateLabel(extracted, applicationData);

    const result: VerificationResult = {
      id: uuid(),
      metadata: {
        id: uuid(),
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user?.id || 'unknown',
        filename: req.file.originalname,
        imageUrl: 'https://s3.example.com/labels/' + uuid(),
        processingStatus: 'completed',
        confidence: overallConfidence,
      },
      extracted,
      application: applicationData,
      comparisons,
      overallConfidence,
      status: overallConfidence >= 90 ? 'approved' : overallConfidence >= 70 ? 'review_required' : 'rejected',
    };

    logger.info(`Label verified: ${result.id}`);
    return sendSuccess(res, result);
  } catch (error) {
    logger.error('Label verification failed', error);
    return sendError(res, 'VERIFICATION_FAILED', (error as Error).message, 500);
  }
});

export default router;
