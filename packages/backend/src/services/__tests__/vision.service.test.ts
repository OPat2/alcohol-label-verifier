import { extractLabelText, parseExtractedText, preprocessImage } from '@/services/vision.service';

// Always use mock mode in tests to avoid OCR engine startup
beforeAll(() => {
  process.env.MOCK_VISION_API = 'true';
});

afterAll(() => {
  delete process.env.MOCK_VISION_API;
});

describe('extractLabelText (mock mode)', () => {
  it('returns a valid ExtractedLabel from mock data', async () => {
    const buffer = Buffer.from('fake image data');
    const result = await extractLabelText(buffer);

    expect(result).toBeDefined();
    expect(result.brandName).toBe('OLD TOM DISTILLERY');
    expect(result.abv?.percentage).toBe(45);
    expect(result.abv?.proof).toBe(90);
    expect(result.netContents?.volume).toBe(750);
    expect(result.netContents?.unit).toBe('mL');
    expect(result.governmentWarning).toBeDefined();
    expect(result.rawText.length).toBeGreaterThan(0);
  });

  it('returns government warning starting with GOVERNMENT WARNING:', async () => {
    const buffer = Buffer.from('fake image data');
    const result = await extractLabelText(buffer);
    expect(result.governmentWarning).toMatch(/^GOVERNMENT WARNING:/);
  });

  it('returns classType', async () => {
    const buffer = Buffer.from('fake image data');
    const result = await extractLabelText(buffer);
    expect(result.classType).toBe('Kentucky Straight Bourbon Whiskey');
  });

  it('returns bottlerName', async () => {
    const buffer = Buffer.from('fake image data');
    const result = await extractLabelText(buffer);
    expect(result.bottlerName).toBeDefined();
  });
});

describe('parseExtractedText', () => {
  const sampleText = [
    'OLD TOM DISTILLERY',
    'Kentucky Straight Bourbon Whiskey',
    '45% Alc./Vol. (90 Proof)',
    '750 mL',
    'Bottled by Old Tom Distillery, Inc., Louisville, KY',
    'Product of USA',
    'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
  ].join('\n');

  it('extracts ABV percentage', () => {
    const result = parseExtractedText(sampleText);
    expect(result.abv?.percentage).toBe(45);
  });

  it('extracts ABV proof', () => {
    const result = parseExtractedText(sampleText);
    expect(result.abv?.proof).toBe(90);
  });

  it('extracts net contents', () => {
    const result = parseExtractedText(sampleText);
    expect(result.netContents?.volume).toBe(750);
    expect(result.netContents?.unit).toBe('mL');
  });

  it('extracts government warning starting with GOVERNMENT WARNING:', () => {
    const result = parseExtractedText(sampleText);
    expect(result.governmentWarning).toMatch(/^GOVERNMENT WARNING:/);
  });

  it('extracts class type', () => {
    const result = parseExtractedText(sampleText);
    expect(result.classType).toMatch(/Kentucky Straight Bourbon/i);
  });

  it('extracts bottler name', () => {
    const result = parseExtractedText(sampleText);
    expect(result.bottlerName).toMatch(/Bottled by/i);
  });

  it('extracts country of origin', () => {
    const result = parseExtractedText(sampleText);
    expect(result.countryOfOrigin).toMatch(/USA/i);
  });

  it('extracts brand name', () => {
    const result = parseExtractedText(sampleText);
    expect(result.brandName).toBe('OLD TOM DISTILLERY');
  });

  it('handles text with only L unit', () => {
    const text = 'MY BRAND\n0.75 L\n40%\nGOVERNMENT WARNING:';
    const result = parseExtractedText(text);
    expect(result.netContents?.unit).toBe('L');
    expect(result.netContents?.volume).toBe(0.75);
  });

  it('handles text with proof-only ABV', () => {
    const text = 'MY BRAND\n80 Proof\nGOVERNMENT WARNING:';
    const result = parseExtractedText(text);
    expect(result.abv?.proof).toBe(80);
    expect(result.abv?.percentage).toBe(40);
  });

  it('returns rawText unchanged', () => {
    const result = parseExtractedText(sampleText);
    expect(result.rawText).toBe(sampleText);
  });
});

describe('preprocessImage', () => {
  it('returns a Buffer', async () => {
    // Use a minimal valid PNG (1x1 pixel)
    const pngBuffer = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
      'hex',
    );
    const result = await preprocessImage(pngBuffer);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('returns original buffer on failure gracefully', async () => {
    const badBuffer = Buffer.from('not an image');
    const result = await preprocessImage(badBuffer);
    expect(Buffer.isBuffer(result)).toBe(true);
  });
});
