import { VerificationResult, ApplicationData } from './label';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface VerifyLabelRequest {
  labelImage: File;
  applicationData: ApplicationData;
}

export interface VerifyLabelResponse extends ApiResponse<VerificationResult> {}

export interface BatchUploadRequest {
  labels: BatchLabelItem[];
  metadata?: Record<string, unknown>;
}

export interface BatchLabelItem {
  labelImage: File;
  applicationData: ApplicationData;
}

export interface BatchUploadResponse extends ApiResponse<BatchStatus> {}

export interface BatchStatus {
  batchId: string;
  totalLabels: number;
  processedLabels: number;
  pendingLabels: number;
  failedLabels: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  estimatedTimeRemaining?: number; // seconds
}

export interface BatchResultsResponse extends ApiResponse<BatchResults> {}

export interface BatchResults {
  batchId: string;
  results: VerificationResult[];
  summary: {
    total: number;
    approved: number;
    rejected: number;
    reviewRequired: number;
    averageConfidence: number;
  };
}

export interface PaginationQuery {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
