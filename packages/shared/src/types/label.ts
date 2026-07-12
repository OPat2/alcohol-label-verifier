/**
 * Core label data types
 */

export interface LabelMetadata {
  id: string;
  uploadedAt: string;
  uploadedBy: string;
  filename: string;
  imageUrl: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  confidence: number; // 0-100
  errorMessage?: string;
}

export interface AlcoholBeverage {
  type: 'spirits' | 'wine' | 'beer' | 'malt';
}

export interface ExtractedLabel {
  brandName?: string;
  classType?: string;
  abv?: {
    percentage?: number;
    proof?: number;
    raw: string;
  };
  netContents?: {
    volume: number;
    unit: 'mL' | 'L' | 'oz' | 'fl oz';
    raw: string;
  };
  governmentWarning?: string;
  bottlerName?: string;
  countryOfOrigin?: string;
  rawText: string; // Full OCR output
}

export interface ApplicationData {
  applicationId: string;
  brandName: string;
  classType: string;
  abv: {
    percentage?: number;
    proof?: number;
  };
  netContents: {
    volume: number;
    unit: 'mL' | 'L' | 'oz' | 'fl oz';
  };
  governmentWarning?: string;
  bottlerName?: string;
  countryOfOrigin?: string;
  beverage: AlcoholBeverage;
}

export interface FieldComparison {
  field: string;
  applicationValue: string;
  labelValue: string;
  match: boolean;
  matchType: 'exact' | 'normalized' | 'mismatch' | 'missing';
  confidence: number; // 0-100
  notes?: string;
}

export interface VerificationResult {
  id: string;
  metadata: LabelMetadata;
  extracted: ExtractedLabel;
  application: ApplicationData;
  comparisons: FieldComparison[];
  overallConfidence: number; // 0-100
  status: 'approved' | 'rejected' | 'review_required';
  agentNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  timings?: {
    uploadMs?: number;
    preprocessMs?: number;
    ocrMs?: number;
    validationMs?: number;
    totalMs?: number;
  };
}
