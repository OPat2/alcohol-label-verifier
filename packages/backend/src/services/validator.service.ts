import { ExtractedLabel, ApplicationData, FieldComparison, ValidatorConfig } from '@shared/types';
import { GOVERNMENT_WARNING_TEXT } from '@shared/constants';
import { createLogger } from '@/utils/logger';

const logger = createLogger('services:validator');

const DEFAULT_CONFIG: ValidatorConfig = {
  brandNameFuzzyRatio: 0.85,
  exactWarningMatch: true,
  proofCalculationTolerance: 1, // 1% absolute tolerance on ABV
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
  comparisons.push(compareBrandName(extracted.brandName, application.brandName, finalConfig));

  // Class/type comparison
  if (application.classType) {
    comparisons.push(
      compareClassType(extracted.classType, application.classType, finalConfig),
    );
  }

  // ABV comparison
  if (application.abv) {
    comparisons.push(compareABV(extracted.abv, application.abv, finalConfig));
  }

  // Net contents comparison
  if (application.netContents) {
    comparisons.push(
      compareNetContents(extracted.netContents, application.netContents, finalConfig),
    );
  }

  // Government warning (mandatory)
  comparisons.push(
    compareGovernmentWarning(extracted.governmentWarning, finalConfig),
  );

  // Bottler name (when provided in application)
  if (application.bottlerName) {
    comparisons.push(
      compareBottlerName(extracted.bottlerName, application.bottlerName, finalConfig),
    );
  }

  // Country of origin (when provided in application)
  if (application.countryOfOrigin) {
    comparisons.push(
      compareCountryOfOrigin(extracted.countryOfOrigin, application.countryOfOrigin),
    );
  }

  // Calculate overall confidence (weighted by field importance)
  const weights: Record<string, number> = {
    brandName: 2,
    classType: 1.5,
    abv: 2,
    netContents: 1.5,
    governmentWarning: 2,
    bottlerName: 1,
    countryOfOrigin: 1,
  };

  let totalWeight = 0;
  let weightedSum = 0;
  for (const comp of comparisons) {
    const w = weights[comp.field] ?? 1;
    totalWeight += w;
    weightedSum += comp.confidence * w;
  }

  const overallConfidence =
    totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  logger.info(
    `Validation complete: ${comparisons.length} fields checked, overall confidence ${overallConfidence}%`,
  );

  return { comparisons, overallConfidence };
};

// ─────────────────────────────────────────────────────────────────────────────
// Field comparators
// ─────────────────────────────────────────────────────────────────────────────

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
      matchType: 'missing',
      confidence: 0,
      notes: 'Brand name not detected on label',
    };
  }

  // Exact match (case-insensitive)
  const extractedNorm = normalizeText(extracted);
  const applicationNorm = normalizeText(application);

  if (extractedNorm === applicationNorm) {
    return {
      field: 'brandName',
      applicationValue: application,
      labelValue: extracted,
      match: true,
      matchType: 'exact',
      confidence: 100,
    };
  }

  // Fuzzy / normalized match
  const similarity = calculateSimilarity(extractedNorm, applicationNorm);
  const isNormalizedMatch = similarity >= config.brandNameFuzzyRatio;

  return {
    field: 'brandName',
    applicationValue: application,
    labelValue: extracted,
    match: isNormalizedMatch,
    matchType: isNormalizedMatch ? 'normalized' : 'mismatch',
    confidence: Math.round(similarity * 100),
    notes: !isNormalizedMatch
      ? `Brand name similarity ${(similarity * 100).toFixed(0)}% is below the ${(config.brandNameFuzzyRatio * 100).toFixed(0)}% threshold`
      : `Case/punctuation difference: "${extracted}" ≈ "${application}"`,
  };
};

const compareClassType = (
  extracted: string | undefined,
  application: string,
  config: ValidatorConfig,
): FieldComparison => {
  if (!extracted) {
    return {
      field: 'classType',
      applicationValue: application,
      labelValue: '',
      match: false,
      matchType: 'missing',
      confidence: 0,
      notes: 'Class/type not detected on label',
    };
  }

  const extractedNorm = normalizeText(extracted);
  const applicationNorm = normalizeText(application);

  if (extractedNorm === applicationNorm) {
    return {
      field: 'classType',
      applicationValue: application,
      labelValue: extracted,
      match: true,
      matchType: 'exact',
      confidence: 100,
    };
  }

  // Check if one contains the other
  const isSubstring =
    extractedNorm.includes(applicationNorm) || applicationNorm.includes(extractedNorm);
  const similarity = calculateSimilarity(extractedNorm, applicationNorm);
  const isMatch = isSubstring || similarity >= config.brandNameFuzzyRatio;

  return {
    field: 'classType',
    applicationValue: application,
    labelValue: extracted,
    match: isMatch,
    matchType: isMatch ? 'normalized' : 'mismatch',
    confidence: isSubstring ? 90 : Math.round(similarity * 100),
    notes: !isMatch ? 'Class/type designation does not match application' : undefined,
  };
};

const compareABV = (
  extracted: ExtractedLabel['abv'],
  application: ApplicationData['abv'],
  config: ValidatorConfig,
): FieldComparison => {
  const extractedPct =
    extracted?.percentage ?? (extracted?.proof != null ? extracted.proof / 2 : undefined);
  const applicationPct =
    application.percentage ?? (application.proof != null ? application.proof / 2 : undefined);

  if (extractedPct == null) {
    return {
      field: 'abv',
      applicationValue: formatAbv(application),
      labelValue: '',
      match: false,
      matchType: 'missing',
      confidence: 0,
      notes: 'Alcohol content not detected on label',
    };
  }

  if (applicationPct == null) {
    return {
      field: 'abv',
      applicationValue: '',
      labelValue: formatAbv(extracted),
      match: false,
      matchType: 'mismatch',
      confidence: 50,
      notes: 'Application ABV not provided',
    };
  }

  const difference = Math.abs(extractedPct - applicationPct);
  const isMatch = difference <= config.proofCalculationTolerance;
  const confidence = isMatch
    ? 100
    : Math.max(0, Math.round(100 - difference * 20));

  // Validate proof = ABV * 2 consistency
  const proofConsistent =
    extracted?.proof == null ||
    Math.abs(extracted.proof - extractedPct * 2) <= 1;

  return {
    field: 'abv',
    applicationValue: formatAbv(application),
    labelValue: formatAbv(extracted),
    match: isMatch,
    matchType: isMatch ? 'exact' : 'mismatch',
    confidence,
    notes: !isMatch
      ? `ABV difference: ${difference.toFixed(2)}% (extracted ${extractedPct}%, application ${applicationPct}%)`
      : !proofConsistent
        ? 'Warning: proof value inconsistent with % Alc./Vol. on label'
        : undefined,
  };
};

const compareNetContents = (
  extracted: ExtractedLabel['netContents'],
  application: ApplicationData['netContents'],
  _config: ValidatorConfig,
): FieldComparison => {
  if (!extracted) {
    return {
      field: 'netContents',
      applicationValue: `${application.volume} ${application.unit}`,
      labelValue: '',
      match: false,
      matchType: 'missing',
      confidence: 0,
      notes: 'Net contents not detected on label',
    };
  }

  const extractedMl = convertToMl(extracted.volume, extracted.unit);
  const applicationMl = convertToMl(application.volume, application.unit);

  // Allow 1% volume tolerance (fill tolerances)
  const tolerance = applicationMl * 0.01;
  const isMatch = Math.abs(extractedMl - applicationMl) <= tolerance;

  return {
    field: 'netContents',
    applicationValue: `${application.volume} ${application.unit}`,
    labelValue: `${extracted.volume} ${extracted.unit}`,
    match: isMatch,
    matchType: isMatch ? (extracted.unit === application.unit ? 'exact' : 'normalized') : 'mismatch',
    confidence: isMatch ? 100 : 30,
    notes: !isMatch
      ? `Net contents mismatch: label shows ${extracted.volume} ${extracted.unit} (${extractedMl.toFixed(1)} mL), application shows ${application.volume} ${application.unit} (${applicationMl.toFixed(1)} mL)`
      : extracted.unit !== application.unit
        ? `Units differ but volumes are equivalent: ${extracted.volume} ${extracted.unit} = ${application.volume} ${application.unit}`
        : undefined,
  };
};

/**
 * Government warning validation
 * TTB requires EXACT canonical text with GOVERNMENT WARNING: in ALL CAPS.
 * Returns detailed pass/fail reasons.
 */
export const compareGovernmentWarning = (
  extracted: string | undefined,
  _config: ValidatorConfig,
): FieldComparison => {
  const applicationValue = GOVERNMENT_WARNING_TEXT;

  if (!extracted) {
    return {
      field: 'governmentWarning',
      applicationValue,
      labelValue: '',
      match: false,
      matchType: 'missing',
      confidence: 0,
      notes: 'FAIL: Government warning statement not found on label',
    };
  }

  const reasons: string[] = [];

  // Check 1: GOVERNMENT WARNING: header is present in ALL CAPS
  if (!/^GOVERNMENT WARNING:/.test(extracted.trim())) {
    if (/^government warning:/i.test(extracted.trim())) {
      reasons.push('FAIL: "GOVERNMENT WARNING:" header must be in ALL CAPS');
    } else {
      reasons.push('FAIL: Warning does not begin with required "GOVERNMENT WARNING:" header');
    }
  }

  // Check 2: Normalize and compare canonical text
  const normalizedExtracted = normalizeWarningText(extracted);
  const normalizedCanonical = normalizeWarningText(applicationValue);

  const isTextMatch = normalizedExtracted === normalizedCanonical;
  if (!isTextMatch) {
    const similarity = calculateSimilarity(normalizedExtracted, normalizedCanonical);
    if (similarity < 0.9) {
      reasons.push(
        `FAIL: Warning text deviates significantly from required canonical text (similarity: ${(similarity * 100).toFixed(0)}%)`,
      );
    } else {
      reasons.push(
        'WARN: Minor punctuation or spacing difference from canonical warning text',
      );
    }
  }

  // Check 3: Clause (1) present
  if (!/\(1\)/.test(extracted)) {
    reasons.push('FAIL: Missing required clause (1) from government warning');
  }

  // Check 4: Clause (2) present
  if (!/\(2\)/.test(extracted)) {
    reasons.push('FAIL: Missing required clause (2) from government warning');
  }

  // Check 5: Surgeon General mention
  if (!/Surgeon General/i.test(extracted)) {
    reasons.push('FAIL: Warning must reference the Surgeon General');
  }

  // Check 6: Pregnancy / birth defects content
  if (!/pregnancy/i.test(extracted) || !/birth defects/i.test(extracted)) {
    reasons.push('FAIL: Warning must include pregnancy and birth defect language');
  }

  // Check 7: Impairment content
  if (!/impairs/i.test(extracted) && !/ability to drive/i.test(extracted)) {
    reasons.push('FAIL: Warning must include impairment language');
  }

  const passed = reasons.length === 0;
  const hasHeaderAllCaps = /^GOVERNMENT WARNING:/.test(extracted.trim());
  const confidence = passed
    ? 100
    : hasHeaderAllCaps && reasons.every((r) => r.startsWith('WARN'))
      ? 80
      : Math.max(
          0,
          100 - reasons.filter((r) => r.startsWith('FAIL')).length * 20,
        );

  return {
    field: 'governmentWarning',
    applicationValue,
    labelValue: extracted.substring(0, 150) + (extracted.length > 150 ? '…' : ''),
    match: passed,
    matchType: passed ? 'exact' : 'mismatch',
    confidence,
    notes: passed
      ? 'Government warning meets all requirements'
      : reasons.join(' | '),
  };
};

const compareBottlerName = (
  extracted: string | undefined,
  application: string,
  config: ValidatorConfig,
): FieldComparison => {
  if (!extracted) {
    return {
      field: 'bottlerName',
      applicationValue: application,
      labelValue: '',
      match: false,
      matchType: 'missing',
      confidence: 0,
      notes: 'Bottler/producer name not detected on label',
    };
  }

  const extractedNorm = normalizeText(extracted);
  const applicationNorm = normalizeText(application);
  const similarity = calculateSimilarity(extractedNorm, applicationNorm);
  const isMatch = similarity >= config.brandNameFuzzyRatio;

  return {
    field: 'bottlerName',
    applicationValue: application,
    labelValue: extracted,
    match: isMatch,
    matchType: isMatch ? 'normalized' : 'mismatch',
    confidence: Math.round(similarity * 100),
    notes: !isMatch ? 'Bottler/producer name does not match application' : undefined,
  };
};

const compareCountryOfOrigin = (
  extracted: string | undefined,
  application: string,
): FieldComparison => {
  if (!extracted) {
    return {
      field: 'countryOfOrigin',
      applicationValue: application,
      labelValue: '',
      match: false,
      matchType: 'missing',
      confidence: 0,
      notes: 'Country of origin not detected on label (required for imports)',
    };
  }

  const extractedNorm = normalizeText(extracted);
  const applicationNorm = normalizeText(application);
  const isMatch =
    extractedNorm === applicationNorm ||
    extractedNorm.includes(applicationNorm) ||
    applicationNorm.includes(extractedNorm);

  return {
    field: 'countryOfOrigin',
    applicationValue: application,
    labelValue: extracted,
    match: isMatch,
    matchType: isMatch ? 'normalized' : 'mismatch',
    confidence: isMatch ? 100 : 20,
    notes: !isMatch ? 'Country of origin does not match application' : undefined,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Lowercase, strip punctuation, collapse whitespace */
export const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Normalize warning for text comparison: collapse whitespace, lowercase */
const normalizeWarningText = (text: string): string =>
  text
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();

/** Levenshtein-based similarity (0–1) */
export const calculateSimilarity = (a: string, b: string): number => {
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (longer.length === 0) return 1.0;
  const dist = getLevenshteinDistance(longer, shorter);
  return (longer.length - dist) / longer.length;
};

const getLevenshteinDistance = (a: string, b: string): number => {
  // Cap inputs to avoid unbounded iteration on user-controlled strings
  const MAX_LEN = 500;
  const sa = a.slice(0, MAX_LEN);
  const sb = b.slice(0, MAX_LEN);
  const dp: number[][] = Array.from({ length: sa.length + 1 }, (_, i) =>
    Array.from({ length: sb.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= sa.length; i++) {
    for (let j = 1; j <= sb.length; j++) {
      dp[i][j] =
        sa[i - 1] === sb[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[sa.length][sb.length];
};

const formatAbv = (abv: { percentage?: number; proof?: number; raw?: string } | undefined): string => {
  if (!abv) return '';
  if (abv.raw) return abv.raw;
  const parts: string[] = [];
  if (abv.percentage != null) parts.push(`${abv.percentage}%`);
  if (abv.proof != null) parts.push(`(${abv.proof} Proof)`);
  return parts.join(' ');
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
