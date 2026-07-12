import { validateLabel } from '@/services/validator.service';
import { ExtractedLabel, ApplicationData } from '@shared/types';

describe('ValidatorService', () => {
  const mockExtracted: ExtractedLabel = {
    brandName: 'OLD TOM DISTILLERY',
    classType: 'Kentucky Straight Bourbon Whiskey',
    abv: {
      percentage: 45,
      proof: 90,
      raw: '45% Alc./Vol. (90 Proof)',
    },
    netContents: {
      volume: 750,
      unit: 'mL',
      raw: '750 mL',
    },
    governmentWarning: 'GOVERNMENT WARNING: (1) According to the Surgeon General...',
    rawText: 'Full OCR text',
  };

  const mockApplication: ApplicationData = {
    applicationId: 'app-001',
    brandName: 'Old Tom Distillery',
    classType: 'Kentucky Straight Bourbon Whiskey',
    abv: {
      percentage: 45,
      proof: 90,
    },
    netContents: {
      volume: 750,
      unit: 'mL',
    },
    governmentWarning: 'GOVERNMENT WARNING: (1) According to the Surgeon General...',
    bottlerName: 'Old Tom Distillery Inc.',
    countryOfOrigin: 'USA',
    beverage: {
      type: 'spirits',
    },
  };

  it('should validate matching label and application data', () => {
    const result = validateLabel(mockExtracted, mockApplication);

    expect(result.comparisons.length).toBeGreaterThan(0);
    expect(result.overallConfidence).toBeGreaterThan(70);
    expect(result.comparisons[0].field).toBe('brandName');
  });

  it('should detect ABV mismatch', () => {
    const mismatchedApp = {
      ...mockApplication,
      abv: { percentage: 50, proof: 100 },
    };

    const result = validateLabel(mockExtracted, mismatchedApp);
    const abvComparison = result.comparisons.find((c) => c.field === 'abv');

    expect(abvComparison?.match).toBe(false);
    expect(abvComparison?.confidence).toBeLessThan(100);
  });

  it('should detect brand name fuzzy match', () => {
    const fuzzyApp = {
      ...mockApplication,
      brandName: 'Old Tom Distllery', // Typo
    };

    const result = validateLabel(mockExtracted, fuzzyApp);
    const brandComparison = result.comparisons.find((c) => c.field === 'brandName');

    expect(brandComparison?.confidence).toBeGreaterThan(70);
  });

  it('should detect net contents mismatch', () => {
    const mismatchedApp = {
      ...mockApplication,
      netContents: { volume: 1000, unit: 'mL' as const },
    };

    const result = validateLabel(mockExtracted, mismatchedApp);
    const contentsComparison = result.comparisons.find((c) => c.field === 'netContents');

    expect(contentsComparison?.match).toBe(false);
  });

  it('should return high overall confidence for perfect match', () => {
    const result = validateLabel(mockExtracted, mockApplication);
    expect(result.overallConfidence).toBeGreaterThanOrEqual(80);
  });
});
