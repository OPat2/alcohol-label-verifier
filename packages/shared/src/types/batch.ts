export interface BatchJob {
  id: string;
  userId: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface BatchJobItem {
  id: string;
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
  processedAt?: Date;
}
