import { Router, Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { sendSuccess, sendError } from '@/utils/response';
import { createLogger } from '@/utils/logger';
import multer from 'multer';
import { extractLabelText, preprocessImage } from '@/services/vision.service';
import { validateLabel } from '@/services/validator.service';
import { VerificationResult, ApplicationData } from '@label-verifier/shared';
import { v4 as uuid } from 'uuid';

const router = Router();
const logger = createLogger('routes:labels');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image type: ${file.mimetype}`));
    }
  },
});

router.post('/verify', upload.single('labelImage'), async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();
  const timings: VerificationResult['timings'] = {};

  try {
    if (!req.file) {
      return sendError(res, 'FILE_MISSING', 'No image file provided', 400);
    }

    if (!req.body.applicationData) {
      return sendError(res, 'VALIDATION_FAILED', 'Application data required', 400);
    }

    let applicationData: ApplicationData;
    try {
      applicationData = JSON.parse(req.body.applicationData);
    } catch {
      return sendError(res, 'VALIDATION_FAILED', 'Invalid application data JSON', 400);
    }

    // Validate required fields
    if (!applicationData.brandName) {
      return sendError(res, 'VALIDATION_FAILED', 'brandName is required in application data', 400);
    }

    // Preprocess image
    const preprocessStart = Date.now();
    const processedImage = await preprocessImage(req.file.buffer);
    timings.preprocessMs = Date.now() - preprocessStart;

    // Extract text from image
    const ocrStart = Date.now();
    let extracted;
    try {
      extracted = await extractLabelText(processedImage);
    } catch (ocrError) {
      logger.warn('OCR failed, using empty extraction', ocrError);
      return sendError(
        res,
        'VISION_API_ERROR',
        `OCR failed: ${(ocrError as Error).message}. Please check image quality.`,
        422,
      );
    }
    timings.ocrMs = Date.now() - ocrStart;

    // Validate label against application data
    const validationStart = Date.now();
    const { comparisons, overallConfidence } = validateLabel(extracted, applicationData);
    timings.validationMs = Date.now() - validationStart;
    timings.totalMs = Date.now() - startTime;

    const status =
      overallConfidence >= 90
        ? 'approved'
        : overallConfidence >= 70
          ? 'review_required'
          : 'rejected';

    const result: VerificationResult = {
      id: uuid(),
      metadata: {
        id: uuid(),
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user?.id || 'anonymous',
        filename: req.file.originalname,
        imageUrl: '',
        processingStatus: 'completed',
        confidence: overallConfidence,
      },
      extracted,
      application: applicationData,
      comparisons,
      overallConfidence,
      status,
      timings,
    };

    logger.info(
      `Label verified: id=${result.id} status=${status} confidence=${overallConfidence}% totalMs=${timings.totalMs}`,
    );
    return sendSuccess(res, result);
  } catch (error) {
    timings.totalMs = Date.now() - startTime;
    logger.error('Label verification failed', error);
    return sendError(res, 'VERIFICATION_FAILED', (error as Error).message, 500);
  }
});

export default router;
