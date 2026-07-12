import {
  validateLabel,
  compareGovernmentWarning,
  normalizeText,
  calculateSimilarity,
} from '@/services/validator.service';
import { ExtractedLabel, ApplicationData } from '@shared/types';
import { GOVERNMENT_WARNING_TEXT } from '@shared/constants';

const CANONICAL_WARNING = GOVERNMENT_WARNING_TEXT;

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
  bottlerName: 'Old Tom Distillery, Inc., Louisville, KY',
  countryOfOrigin: 'USA',
  governmentWarning: CANONICAL_WARNING,
  rawText: 'Full OCR text here',
};

const mockApplication: ApplicationData = {
  applicationId: 'app-001',
  brandName: 'Old Tom Distillery',
  classType: 'Kentucky Straight Bourbon Whiskey',
  abv: { percentage: 45, proof: 90 },
  netContents: { volume: 750, unit: 'mL' },
  governmentWarning: CANONICAL_WARNING,
  bottlerName: 'Old Tom Distillery, Inc.',
  countryOfOrigin: 'USA',
  beverage: { type: 'spirits' },
};

// ─────────────────────────────────────────────────────────────────────────────
// validateLabel
// ─────────────────────────────────────────────────────────────────────────────

describe('validateLabel', () => {
  it('returns comparisons for all provided fields', () => {
    const result = validateLabel(mockExtracted, mockApplication);
    expect(result.comparisons.length).toBeGreaterThanOrEqual(5);
    const fields = result.comparisons.map((c) => c.field);
    expect(fields).toContain('brandName');
    expect(fields).toContain('abv');
    expect(fields).toContain('netContents');
    expect(fields).toContain('governmentWarning');
  });

  it('gives high confidence for a perfect match', () => {
    const result = validateLabel(mockExtracted, mockApplication);
    expect(result.overallConfidence).toBeGreaterThanOrEqual(90);
  });

  it('detects ABV mismatch and lowers confidence', () => {
    const appWithWrongABV = { ...mockApplication, abv: { percentage: 50, proof: 100 } };
    const result = validateLabel(mockExtracted, appWithWrongABV);
    const abvComp = result.comparisons.find((c) => c.field === 'abv');
    expect(abvComp?.match).toBe(false);
    expect(abvComp?.confidence).toBeLessThan(100);
    expect(result.overallConfidence).toBeLessThan(100);
  });

  it('detects net contents mismatch', () => {
    const appWithWrongContents = {
      ...mockApplication,
      netContents: { volume: 1000, unit: 'mL' as const },
    };
    const result = validateLabel(mockExtracted, appWithWrongContents);
    const contentsComp = result.comparisons.find((c) => c.field === 'netContents');
    expect(contentsComp?.match).toBe(false);
  });

  it('handles missing brand name on label (confidence = 0)', () => {
    const noBrand: ExtractedLabel = { ...mockExtracted, brandName: undefined };
    const result = validateLabel(noBrand, mockApplication);
    const brandComp = result.comparisons.find((c) => c.field === 'brandName');
    expect(brandComp?.match).toBe(false);
    expect(brandComp?.confidence).toBe(0);
    expect(brandComp?.matchType).toBe('missing');
  });

  it('includes classType comparison when application has classType', () => {
    const result = validateLabel(mockExtracted, mockApplication);
    const classComp = result.comparisons.find((c) => c.field === 'classType');
    expect(classComp).toBeDefined();
    expect(classComp?.match).toBe(true);
  });

  it('includes bottlerName comparison when application provides it', () => {
    const result = validateLabel(mockExtracted, mockApplication);
    const bottlerComp = result.comparisons.find((c) => c.field === 'bottlerName');
    expect(bottlerComp).toBeDefined();
  });

  it('includes countryOfOrigin comparison when application provides it', () => {
    const result = validateLabel(mockExtracted, mockApplication);
    const countryComp = result.comparisons.find((c) => c.field === 'countryOfOrigin');
    expect(countryComp).toBeDefined();
    expect(countryComp?.match).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Brand name normalization
// ─────────────────────────────────────────────────────────────────────────────

describe('brand name comparison', () => {
  it('matches STONE\'S THROW (all caps on label) to Stone\'s Throw (mixed in application)', () => {
    const extracted: ExtractedLabel = { ...mockExtracted, brandName: "STONE'S THROW" };
    const app: ApplicationData = { ...mockApplication, brandName: "Stone's Throw" };
    const result = validateLabel(extracted, app);
    const brandComp = result.comparisons.find((c) => c.field === 'brandName');
    expect(brandComp?.match).toBe(true);
    // After normalization they become identical → 'exact', original strings differ → could be 'normalized'
    expect(['exact', 'normalized']).toContain(brandComp?.matchType);
  });

  it('matches with trailing/leading whitespace', () => {
    const extracted: ExtractedLabel = { ...mockExtracted, brandName: '  OLD TOM DISTILLERY  ' };
    const app: ApplicationData = { ...mockApplication, brandName: 'Old Tom Distillery' };
    const result = validateLabel(extracted, app);
    const brandComp = result.comparisons.find((c) => c.field === 'brandName');
    expect(brandComp?.match).toBe(true);
  });

  it('fails on significantly different brand names', () => {
    const extracted: ExtractedLabel = { ...mockExtracted, brandName: 'COMPLETELY DIFFERENT' };
    const app: ApplicationData = { ...mockApplication, brandName: 'Old Tom Distillery' };
    const result = validateLabel(extracted, app);
    const brandComp = result.comparisons.find((c) => c.field === 'brandName');
    expect(brandComp?.match).toBe(false);
    expect(brandComp?.matchType).toBe('mismatch');
  });

  it('uses matchType=exact for case-identical normalized match', () => {
    const extracted: ExtractedLabel = { ...mockExtracted, brandName: 'Old Tom Distillery' };
    const result = validateLabel(extracted, mockApplication);
    const brandComp = result.comparisons.find((c) => c.field === 'brandName');
    expect(brandComp?.matchType).toBe('exact');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ABV comparison
// ─────────────────────────────────────────────────────────────────────────────

describe('ABV comparison', () => {
  it('passes when ABV matches exactly', () => {
    const result = validateLabel(mockExtracted, mockApplication);
    const abvComp = result.comparisons.find((c) => c.field === 'abv');
    expect(abvComp?.match).toBe(true);
    expect(abvComp?.confidence).toBe(100);
  });

  it('fails when ABV differs by more than tolerance', () => {
    const extracted: ExtractedLabel = {
      ...mockExtracted,
      abv: { percentage: 40, raw: '40%' },
    };
    const result = validateLabel(extracted, mockApplication);
    const abvComp = result.comparisons.find((c) => c.field === 'abv');
    expect(abvComp?.match).toBe(false);
  });

  it('passes when ABV is within tolerance', () => {
    const extracted: ExtractedLabel = {
      ...mockExtracted,
      abv: { percentage: 45.5, raw: '45.5%' },
    };
    const result = validateLabel(extracted, mockApplication);
    const abvComp = result.comparisons.find((c) => c.field === 'abv');
    expect(abvComp?.match).toBe(true);
  });

  it('calculates percentage from proof when percentage missing', () => {
    const extracted: ExtractedLabel = {
      ...mockExtracted,
      abv: { proof: 90, raw: '90 Proof' },
    };
    const result = validateLabel(extracted, mockApplication);
    const abvComp = result.comparisons.find((c) => c.field === 'abv');
    expect(abvComp?.match).toBe(true);
  });

  it('shows missing matchType when ABV not on label', () => {
    const extracted: ExtractedLabel = { ...mockExtracted, abv: undefined };
    const result = validateLabel(extracted, mockApplication);
    const abvComp = result.comparisons.find((c) => c.field === 'abv');
    expect(abvComp?.match).toBe(false);
    expect(abvComp?.matchType).toBe('missing');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Net contents comparison
// ─────────────────────────────────────────────────────────────────────────────

describe('net contents comparison', () => {
  it('passes for exact unit and volume match', () => {
    const result = validateLabel(mockExtracted, mockApplication);
    const comp = result.comparisons.find((c) => c.field === 'netContents');
    expect(comp?.match).toBe(true);
  });

  it('fails for volume mismatch', () => {
    const extracted: ExtractedLabel = {
      ...mockExtracted,
      netContents: { volume: 1000, unit: 'mL', raw: '1000 mL' },
    };
    const result = validateLabel(extracted, mockApplication);
    const comp = result.comparisons.find((c) => c.field === 'netContents');
    expect(comp?.match).toBe(false);
  });

  it('normalizes units: 750 mL matches 0.75 L', () => {
    const extracted: ExtractedLabel = {
      ...mockExtracted,
      netContents: { volume: 0.75, unit: 'L', raw: '0.75 L' },
    };
    const result = validateLabel(extracted, mockApplication);
    const comp = result.comparisons.find((c) => c.field === 'netContents');
    expect(comp?.match).toBe(true);
    expect(comp?.matchType).toBe('normalized');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Government warning validation (strict checks)
// ─────────────────────────────────────────────────────────────────────────────

describe('compareGovernmentWarning', () => {
  const config = {
    brandNameFuzzyRatio: 0.85,
    exactWarningMatch: true,
    proofCalculationTolerance: 1,
    allowedUnitVariations: ['mL', 'L', 'oz', 'fl oz'],
    confidenceThresholds: { autoApprove: 90, reviewRequired: 70, autoReject: 70 },
  };

  it('passes the exact canonical warning text', () => {
    const result = compareGovernmentWarning(CANONICAL_WARNING, config);
    expect(result.match).toBe(true);
    expect(result.confidence).toBe(100);
    expect(result.matchType).toBe('exact');
  });

  it('fails when GOVERNMENT WARNING: is not in ALL CAPS', () => {
    const badWarning = 'Government Warning: ' + CANONICAL_WARNING.split(': ').slice(1).join(': ');
    const result = compareGovernmentWarning(badWarning, config);
    expect(result.match).toBe(false);
    expect(result.notes).toMatch(/ALL CAPS/i);
  });

  it('fails when government warning is missing entirely', () => {
    const result = compareGovernmentWarning(undefined, config);
    expect(result.match).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.matchType).toBe('missing');
  });

  it('fails when clause (1) is missing', () => {
    const noClause1 = CANONICAL_WARNING.replace('(1)', '').trim();
    const result = compareGovernmentWarning(noClause1, config);
    expect(result.match).toBe(false);
    expect(result.notes).toMatch(/clause \(1\)/i);
  });

  it('fails when clause (2) is missing', () => {
    const noClause2 = CANONICAL_WARNING.replace('(2)', '').trim();
    const result = compareGovernmentWarning(noClause2, config);
    expect(result.match).toBe(false);
    expect(result.notes).toMatch(/clause \(2\)/i);
  });

  it('fails when Surgeon General mention is missing', () => {
    const noSurgeon = CANONICAL_WARNING.replace('Surgeon General', 'a doctor');
    const result = compareGovernmentWarning(noSurgeon, config);
    expect(result.match).toBe(false);
    expect(result.notes).toMatch(/Surgeon General/i);
  });

  it('fails when pregnancy/birth defects language is missing', () => {
    const noPregnancy = CANONICAL_WARNING.replace(
      /pregnancy because of the risk of birth defects/,
      'recreational purposes',
    );
    const result = compareGovernmentWarning(noPregnancy, config);
    expect(result.match).toBe(false);
    expect(result.notes).toMatch(/pregnancy/i);
  });

  it('fails when impairment language is missing', () => {
    const noImpair = CANONICAL_WARNING.replace(
      'impairs your ability to drive a car or operate machinery, and may cause health problems',
      'affects health',
    );
    const result = compareGovernmentWarning(noImpair, config);
    expect(result.match).toBe(false);
    expect(result.notes).toMatch(/impair/i);
  });

  it('returns all fail reasons in the notes field', () => {
    // Title-case header AND missing clause (2)
    const badWarning = 'Government Warning: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects.';
    const result = compareGovernmentWarning(badWarning, config);
    expect(result.match).toBe(false);
    // Notes should contain multiple failures separated by |
    expect(result.notes).toContain('|');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────────────────────

describe('normalizeText', () => {
  it('lowercases text', () => {
    expect(normalizeText('OLD TOM')).toBe('old tom');
  });

  it('normalizes apostrophes', () => {
    expect(normalizeText("STONE'S")).toContain("stone's");
  });

  it('collapses whitespace', () => {
    expect(normalizeText('  FOO   BAR  ')).toBe('foo bar');
  });

  it('removes non-alphanumeric chars except apostrophe', () => {
    // Commas/punctuation become spaces, then whitespace is collapsed
    expect(normalizeText('Foo, Bar!')).toBe('foo bar');
  });
});

describe('calculateSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(calculateSimilarity('foo', 'foo')).toBe(1.0);
  });

  it('returns less than 1 for different strings', () => {
    expect(calculateSimilarity('foo', 'bar')).toBeLessThan(1.0);
  });

  it('returns 1.0 for empty strings', () => {
    expect(calculateSimilarity('', '')).toBe(1.0);
  });

  it('is order-independent (max-based)', () => {
    const ab = calculateSimilarity('abcdef', 'abc');
    const ba = calculateSimilarity('abc', 'abcdef');
    expect(ab).toBe(ba);
  });
});
