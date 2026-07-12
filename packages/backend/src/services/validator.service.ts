import { ExtractedLabel, ApplicationData, FieldComparison, ValidatorConfig } from '@shared/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('services:validator');

const DEFAULT_CONFIG: ValidatorConfig = {
  brandNameFuzzyRatio: 0.85,
  exactWarningMatch: true,
  proofCalculationTolerance: 5,
  allowedUnitVariations: ['mL', 'L', 'oz', 'fl oz'],
  confidenceThresholds: {
    autoApprove: 90,
    reviewRequired: 70,
    autoReject: 70,
  },
};

export const validateLabel = (
  extracted: ExtractedLabel,
  application: ApplicationData,
  config: Partial<ValidatorConfig> = {},
): { comparisons: FieldComparison[]; overallConfidence: number } => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const comparisons: FieldComparison[] = [];

  // Brand name comparison
  comparisons.push(
    compareBrandName(extracted.brandName, application.brandName, finalConfig),
  );

  // ABV comparison
  if (extracted.abv && application.abv) {
    comparisons.push(compareABV(extracted.abv, application.abv, finalConfig));
  }

  // Net contents comparison
  if (extracted.netContents && application.netContents) {
    comparisons.push(
      compareNetContents(extracted.netContents, application.netContents, finalConfig),
    );
  }

  // Government warning comparison
  if (extracted.governmentWarning) {
    comparisons.push(
      compareGovernmentWarning(extracted.governmentWarning, finalConfig),
    );
  }

  // Calculate overall confidence
  const overallConfidence =
    comparisons.length > 0
      ? Math.round(comparisons.reduce((sum, c) => sum + c.confidence, 0) / comparisons.length)
      : 0;

  return { comparisons, overallConfidence };
};

const compareBrandName = (
  extracted: string | undefined,
  application: string,
  config: ValidatorConfig,
): FieldComparison => {
  if (!extracted) {
    return {
      field: 'brandName',
      applicationValue: application,
      labelValue: '',
      match: false,
      confidence: 0,
      notes: 'Brand name not detected in label',
    };
  }

  const extractedNorm = extracted.toUpperCase().trim();
  const applicationNorm = application.toUpperCase().trim();

  const match = extractedNorm === applicationNorm;
  const similarity = calculateSimilarity(extractedNorm, applicationNorm);
  const confidence = Math.round(similarity * 100);

  return {
    field: 'brandName',
    applicationValue: application,
    labelValue: extracted,
    match: match || similarity >= config.brandNameFuzzyRatio,
    confidence,
    notes:
      similarity < config.brandNameFuzzyRatio
        ? 'Brand name mismatch - possible typo or variation'
        : undefined,
  };
};

const compareABV = (
  extracted: any,
  application: any,
  config: ValidatorConfig,
): FieldComparison => {
  const extractedPercentage = extracted.percentage || proofToPercentage(extracted.proof);
  const applicationPercentage = application.percentage || proofToPercentage(application.proof);

  const difference = Math.abs((extractedPercentage || 0) - (applicationPercentage || 0));
  const match = difference <= config.proofCalculationTolerance;
  const confidence = match ? 100 : Math.max(0, 100 - difference * 10);

  return {
    field: 'abv',
    applicationValue: `${applicationPercentage}%`,
    labelValue: `${extractedPercentage}%`,
    match,
    confidence: Math.round(confidence),
    notes: !match ? `ABV difference: ${difference.toFixed(2)}%` : undefined,
  };
};

const compareNetContents = (
  extracted: any,
  application: any,
  _config: ValidatorConfig,
): FieldComparison => {
  const extractedMl = convertToMl(extracted.volume, extracted.unit);
  const applicationMl = convertToMl(application.volume, application.unit);

  const match = extractedMl === applicationMl;
  const confidence = match ? 100 : 50;

  return {
    field: 'netContents',
    applicationValue: `${application.volume} ${application.unit}`,
    labelValue: `${extracted.volume} ${extracted.unit}`,
    match,
    confidence,
    notes: !match ? 'Net contents mismatch' : undefined,
  };
};

const compareGovernmentWarning = (
  extracted: string,
  config: ValidatorConfig,
): FieldComparison => {
  const hasAllCaps = /GOVERNMENT WARNING/.test(extracted);
  const confidence = hasAllCaps ? 100 : 60;

  return {
    field: 'governmentWarning',
    applicationValue: 'Required',
    labelValue: extracted.substring(0, 50),
    match: hasAllCaps,
    confidence,
    notes: !hasAllCaps ? 'Warning text may not meet formatting requirements' : undefined,
  };
};

const calculateSimilarity = (a: string, b: string): number => {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const getEditDistance = (a: string, b: string): number => {
  const costs = [];
  for (let i = 0; i <= a.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= b.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (a.charAt(i - 1) !== b.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[b.length] = lastValue;
  }
  return costs[b.length];
};

const proofToPercentage = (proof: number | undefined): number | undefined => {
  return proof ? proof / 2 : undefined;
};

const convertToMl = (volume: number, unit: string): number => {
  const conversions: Record<string, number> = {
    mL: 1,
    L: 1000,
    oz: 29.5735,
    'fl oz': 29.5735,
  };
  return volume * (conversions[unit] || 1);
};
