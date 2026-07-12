export interface ValidationRule {
  field: string;
  required: boolean;
  fuzzyMatch?: boolean;
  fuzzyThreshold?: number; // 0-1
  exactMatch?: boolean;
  customValidator?: (value: string, expected: string) => boolean;
}

export interface ValidatorConfig {
  brandNameFuzzyRatio: number;
  exactWarningMatch: boolean;
  proofCalculationTolerance: number; // percentage
  allowedUnitVariations: string[];
  confidenceThresholds: {
    autoApprove: number; // 90-100
    reviewRequired: number; // 70-89
    autoReject: number; // <70
  };
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}
