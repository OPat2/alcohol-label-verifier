import { Router, Response } from 'express';
import multer from 'multer';
import { AuthRequest } from '@/middleware/auth';
import { sendSuccess, sendError } from '@/utils/response';
import { createLogger } from '@/utils/logger';
import {
  createBatchJob,
  getBatchJob,
  processBatchJob,
  exportBatchToCsv,
  BatchInput,
} from '@/services/batch.service';
import { ApplicationData } from '@shared/types';

const router = Router();
const logger = createLogger('routes:batch');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
    if (allowed.includes(file.mimetype) || file.fieldname === 'applicationData') {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

/**
 * POST /api/batch/upload
 * Accepts: multiple label images + corresponding application data JSON array
 * Returns: batchId for polling
 */
router.post(
  '/upload',
  upload.fields([{ name: 'labels', maxCount: 500 }]),
  async (req: AuthRequest, res: Response) => {
    try {
      const files = (req.files as Record<string, Express.Multer.File[]>)?.labels || [];

      if (files.length === 0) {
        return sendError(res, 'FILE_MISSING', 'No label images provided', 400);
      }

      if (!req.body.applicationData) {
        return sendError(
          res,
          'VALIDATION_FAILED',
          'applicationData JSON array is required',
          400,
        );
      }

      let applicationDataList: ApplicationData[];
      try {
        applicationDataList = JSON.parse(req.body.applicationData);
        if (!Array.isArray(applicationDataList)) {
          applicationDataList = [applicationDataList];
        }
      } catch {
        return sendError(
          res,
          'VALIDATION_FAILED',
          'applicationData must be a valid JSON array',
          400,
        );
      }

      if (applicationDataList.length !== files.length) {
        return sendError(
          res,
          'VALIDATION_FAILED',
          `Number of applicationData entries (${applicationDataList.length}) must match number of images (${files.length})`,
          400,
        );
      }

      // Create the batch job
      const job = createBatchJob(req.user?.id || 'anonymous', files.length);

      // Build inputs
      const inputs: BatchInput[] = files.map((file, i) => ({
        imageBuffer: file.buffer,
        filename: file.originalname,
        applicationData: applicationDataList[i],
      }));

      logger.info(
        `Batch job ${job.id} started with ${files.length} items by user ${req.user?.id}`,
      );

      // Process asynchronously (don't await)
      processBatchJob(job.id, inputs).catch((err) => {
        logger.error(`Batch job ${job.id} processing failed`, err);
      });

      return sendSuccess(res, {
        batchId: job.id,
        totalItems: job.totalItems,
        status: job.status,
        message: `Batch of ${files.length} labels queued for processing`,
      });
    } catch (error) {
      logger.error('Batch upload failed', error);
      return sendError(res, 'BATCH_PROCESSING_ERROR', (error as Error).message, 500);
    }
  },
);

/**
 * POST /api/batch/sync
 * Synchronous batch processing (waits for results, better for small batches)
 */
router.post(
  '/sync',
  upload.fields([{ name: 'labels', maxCount: 50 }]),
  async (req: AuthRequest, res: Response) => {
    try {
      const files = (req.files as Record<string, Express.Multer.File[]>)?.labels || [];

      if (files.length === 0) {
        return sendError(res, 'FILE_MISSING', 'No label images provided', 400);
      }

      if (!req.body.applicationData) {
        return sendError(
          res,
          'VALIDATION_FAILED',
          'applicationData JSON array is required',
          400,
        );
      }

      let applicationDataList: ApplicationData[];
      try {
        applicationDataList = JSON.parse(req.body.applicationData);
        if (!Array.isArray(applicationDataList)) {
          applicationDataList = [applicationDataList];
        }
      } catch {
        return sendError(
          res,
          'VALIDATION_FAILED',
          'applicationData must be a valid JSON array',
          400,
        );
      }

      if (applicationDataList.length !== files.length) {
        return sendError(
          res,
          'VALIDATION_FAILED',
          `Mismatch: ${files.length} images but ${applicationDataList.length} application entries`,
          400,
        );
      }

      const job = createBatchJob(req.user?.id || 'anonymous', files.length);
      const inputs: BatchInput[] = files.map((file, i) => ({
        imageBuffer: file.buffer,
        filename: file.originalname,
        applicationData: applicationDataList[i],
      }));

      const completedJob = await processBatchJob(job.id, inputs);

      return sendSuccess(res, {
        batchId: completedJob.id,
        status: completedJob.status,
        summary: completedJob.summary,
        results: completedJob.results,
        errors: completedJob.errors,
      });
    } catch (error) {
      logger.error('Synchronous batch failed', error);
      return sendError(res, 'BATCH_PROCESSING_ERROR', (error as Error).message, 500);
    }
  },
);

/**
 * GET /api/batch/:batchId
 * Get status and results of a batch job
 */
router.get('/:batchId', async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    const job = getBatchJob(batchId);

    if (!job) {
      return sendError(res, 'NOT_FOUND', `Batch job ${batchId} not found`, 404);
    }

    return sendSuccess(res, {
      batchId: job.id,
      status: job.status,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      failedItems: job.failedItems,
      summary: job.summary,
      results: job.results,
      errors: job.errors,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

/**
 * GET /api/batch/:batchId/export/csv
 * Download batch results as CSV
 */
router.get('/:batchId/export/csv', async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    const job = getBatchJob(batchId);

    if (!job) {
      return sendError(res, 'NOT_FOUND', `Batch job ${batchId} not found`, 404);
    }

    if (job.status !== 'completed' && job.status !== 'failed') {
      return sendError(
        res,
        'BATCH_NOT_READY',
        'Batch is still processing',
        409,
      );
    }

    const csv = exportBatchToCsv(job);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="batch-${batchId}-results.csv"`,
    );
    return res.send(csv);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

/**
 * GET /api/batch/:batchId/export/json
 * Download batch results as JSON
 */
router.get('/:batchId/export/json', async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    const job = getBatchJob(batchId);

    if (!job) {
      return sendError(res, 'NOT_FOUND', `Batch job ${batchId} not found`, 404);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="batch-${batchId}-results.json"`,
    );
    return res.json({
      batchId: job.id,
      status: job.status,
      summary: job.summary,
      results: job.results,
      errors: job.errors,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

export default router;
