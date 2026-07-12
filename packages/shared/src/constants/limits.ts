/**
 * Application limits and constraints
 */

export const LIMITS = {
  // File uploads
  MAX_FILE_SIZE_MB: 50,
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],

  // Batch processing
  MAX_BATCH_SIZE: 500,
  MIN_BATCH_SIZE: 1,
  MAX_CONCURRENT_BATCH_JOBS: 5,
  BATCH_TIMEOUT_SECONDS: 600,
  BATCH_ITEM_TIMEOUT_SECONDS: 30,

  // API
  MAX_REQUEST_SIZE_MB: 100,
  REQUEST_TIMEOUT_MS: 30000,
  API_RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  API_RATE_LIMIT_MAX_REQUESTS: 100,

  // Text fields
  MAX_BRAND_NAME_LENGTH: 200,
  MAX_CLASS_TYPE_LENGTH: 100,
  MAX_NOTES_LENGTH: 2000,
  MIN_CONFIDENCE_THRESHOLD: 0.5,
  MAX_CONFIDENCE_THRESHOLD: 1.0,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Data retention
  AUDIT_LOG_RETENTION_DAYS: 2555, // 7 years
} as const;
