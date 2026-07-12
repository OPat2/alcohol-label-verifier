import { v4 as uuid } from 'uuid';
import { VerificationResult, ApplicationData } from '@shared/types';
import { createLogger } from '@/utils/logger';
import { extractLabelText, preprocessImage } from '@/services/vision.service';
import { validateLabel } from '@/services/validator.service';

const logger = createLogger('services:batch');

export interface BatchJob {
  id: string;
  userId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  results: VerificationResult[];
  errors: Array<{ index: number; filename: string; error: string }>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  summary?: BatchSummary;
}

export interface BatchSummary {
  total: number;
  approved: number;
  rejected: number;
  reviewRequired: number;
  failed: number;
  averageConfidence: number;
  totalProcessingMs: number;
}

export interface BatchInput {
  imageBuffer: Buffer;
  filename: string;
  applicationData: ApplicationData;
}

// In-memory store (prototype: production would use Redis/DB)
const batchStore = new Map<string, BatchJob>();

export const createBatchJob = (userId: string, totalItems: number): BatchJob => {
  const job: BatchJob = {
    id: uuid(),
    userId,
    status: 'queued',
    totalItems,
    processedItems: 0,
    failedItems: 0,
    results: [],
    errors: [],
    createdAt: new Date(),
  };
  batchStore.set(job.id, job);
  logger.info(`Batch job created: ${job.id} with ${totalItems} items`);
  return job;
};

export const getBatchJob = (batchId: string): BatchJob | undefined =>
  batchStore.get(batchId);

export const processBatchJob = async (
  batchId: string,
  inputs: BatchInput[],
): Promise<BatchJob> => {
  const job = batchStore.get(batchId);
  if (!job) throw new Error(`Batch job ${batchId} not found`);

  job.status = 'processing';
  job.startedAt = new Date();

  const batchStart = Date.now();

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    try {
      logger.info(
        `Processing batch item ${i + 1}/${inputs.length}: ${input.filename}`,
      );

      const processedImage = await preprocessImage(input.imageBuffer);
      const extracted = await extractLabelText(processedImage);
      const { comparisons, overallConfidence } = validateLabel(
        extracted,
        input.applicationData,
      );

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
          uploadedBy: job.userId,
          filename: input.filename,
          imageUrl: '',
          processingStatus: 'completed',
          confidence: overallConfidence,
        },
        extracted,
        application: input.applicationData,
        comparisons,
        overallConfidence,
        status,
      };

      job.results.push(result);
      job.processedItems++;
    } catch (error) {
      logger.error(`Batch item ${i} failed: ${(error as Error).message}`);
      job.errors.push({
        index: i,
        filename: input.filename,
        error: (error as Error).message,
      });
      job.failedItems++;
      job.processedItems++;
    }

    // Update the store after each item
    batchStore.set(batchId, job);
  }

  const totalMs = Date.now() - batchStart;
  const approved = job.results.filter((r) => r.status === 'approved').length;
  const rejected = job.results.filter((r) => r.status === 'rejected').length;
  const reviewRequired = job.results.filter((r) => r.status === 'review_required').length;
  const avgConfidence =
    job.results.length > 0
      ? job.results.reduce((sum, r) => sum + r.overallConfidence, 0) / job.results.length
      : 0;

  job.summary = {
    total: inputs.length,
    approved,
    rejected,
    reviewRequired,
    failed: job.failedItems,
    averageConfidence: Math.round(avgConfidence),
    totalProcessingMs: totalMs,
  };

  job.status = job.failedItems === inputs.length ? 'failed' : 'completed';
  job.completedAt = new Date();
  batchStore.set(batchId, job);

  logger.info(
    `Batch job ${batchId} completed: ${approved} approved, ${rejected} rejected, ${reviewRequired} review_required, ${job.failedItems} failed in ${totalMs}ms`,
  );

  return job;
};

/**
 * Export batch results as CSV
 */
export const exportBatchToCsv = (job: BatchJob): string => {
  const headers = [
    'Result ID',
    'Filename',
    'Status',
    'Overall Confidence',
    'Brand Name Match',
    'ABV Match',
    'Net Contents Match',
    'Government Warning Match',
    'Brand Name (Label)',
    'Brand Name (Application)',
    'Notes',
  ];

  const rows = job.results.map((r) => {
    const brandComp = r.comparisons.find((c) => c.field === 'brandName');
    const abvComp = r.comparisons.find((c) => c.field === 'abv');
    const contentsComp = r.comparisons.find((c) => c.field === 'netContents');
    const warningComp = r.comparisons.find((c) => c.field === 'governmentWarning');

    return [
      r.id,
      r.metadata.filename,
      r.status,
      r.overallConfidence,
      brandComp ? (brandComp.match ? 'PASS' : 'FAIL') : 'N/A',
      abvComp ? (abvComp.match ? 'PASS' : 'FAIL') : 'N/A',
      contentsComp ? (contentsComp.match ? 'PASS' : 'FAIL') : 'N/A',
      warningComp ? (warningComp.match ? 'PASS' : 'FAIL') : 'N/A',
      brandComp?.labelValue || '',
      brandComp?.applicationValue || '',
      r.comparisons
        .filter((c) => !c.match)
        .map((c) => c.notes)
        .filter(Boolean)
        .join('; '),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
  });

  // Add error rows
  const errorRows = job.errors.map((e) =>
    [e.filename, 'FAILED', 0, '', '', '', '', '', '', '', e.error].map(
      (v) => `"${String(v).replace(/"/g, '""')}"`,
    ),
  );

  return [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((r) => r.join(',')),
    ...errorRows.map((r) => r.join(',')),
  ].join('\n');
};

// Expose store size for health checks
export const getBatchStoreSize = (): number => batchStore.size;
