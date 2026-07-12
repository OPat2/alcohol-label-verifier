import { createWorker } from 'tesseract.js';
import { createLogger } from '@/utils/logger';
import { ExtractedLabel } from '@shared/types';
import sharp from 'sharp';

const logger = createLogger('services:vision');

export const preprocessImage = async (imageBuffer: Buffer): Promise<Buffer> => {
  try {
    const processed = await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .normalize() // Normalize contrast
      .sharpen()
      .toBuffer();

    return processed;
  } catch (error) {
    logger.warn('Image preprocessing failed, using original', error);
    return imageBuffer;
  }
};

export const extractLabelText = async (imageBuffer: Buffer): Promise<ExtractedLabel> => {
  if (process.env.MOCK_VISION_API === 'true') {
    logger.info('Using mock vision API');
    return getMockExtractedLabel();
  }

  const startTime = Date.now();
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(imageBuffer);

    const elapsed = Date.now() - startTime;
    logger.info(`OCR completed in ${elapsed}ms, confidence: ${confidence?.toFixed(1)}%`);

    if (!text || text.trim().length < 5) {
      throw new Error('No readable text detected in image');
    }

    return parseExtractedText(text);
  } finally {
    await worker.terminate();
  }
};

export const parseExtractedText = (text: string): ExtractedLabel => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const result: ExtractedLabel = { rawText: text };

  // Government warning detection - look for the full block
  const warningIdx = lines.findIndex(
    (l) =>
      /GOVERNMENT\s+WARNING/i.test(l) ||
      l.toUpperCase().includes('SURGEON GENERAL'),
  );
  if (warningIdx !== -1) {
    // Collect warning lines until we hit another section or end
    const warningLines = [lines[warningIdx]];
    for (let i = warningIdx + 1; i < lines.length && i < warningIdx + 10; i++) {
      const line = lines[i];
      // Stop if line looks like a new label section (brand/bottler/etc.)
      if (/^\d+(\.\d+)?%/.test(line) || /^\d+\s*(mL|L|oz)/i.test(line)) break;
      warningLines.push(line);
    }
    result.governmentWarning = warningLines.join(' ').replace(/\s+/g, ' ').trim();
  }

  // ABV detection - handles formats like "45% Alc./Vol.", "90 Proof", "45% ABV"
  for (const line of lines) {
    if (!result.abv) {
      const abvMatch = line.match(
        /(\d+(?:\.\d{1,2})?)\s*%\s*(?:Alc\.?\/Vol\.?|ABV|alc\.?\/vol\.?)?/i,
      );
      const proofMatch = line.match(/(\d+(?:\.\d{1,2})?)\s*Proof/i);

      if (abvMatch || proofMatch) {
        result.abv = { raw: line.trim() };
        if (abvMatch) {
          result.abv.percentage = parseFloat(abvMatch[1]);
        }
        if (proofMatch) {
          result.abv.proof = parseFloat(proofMatch[1]);
          if (!result.abv.percentage) {
            result.abv.percentage = result.abv.proof / 2;
          }
        }
        // Look for proof in same line as % (e.g. "45% Alc./Vol. (90 Proof)")
        if (abvMatch && !result.abv.proof) {
          const proofInLine = line.match(/\((\d+)\s*Proof\)/i);
          if (proofInLine) {
            result.abv.proof = parseFloat(proofInLine[1]);
          }
        }
        break;
      }
    }
  }

  // Net contents detection
  for (const line of lines) {
    if (!result.netContents) {
      const sizeMatch = line.match(/(\d+(?:\.\d{1,2})?)\s*(mL|L|fl\.?\s*oz\.?|oz\.?)/i);
      if (sizeMatch) {
        const rawUnit = sizeMatch[2].replace(/\.\s*/g, '').toLowerCase();
        const unitMap: Record<string, 'mL' | 'L' | 'oz' | 'fl oz'> = {
          ml: 'mL',
          l: 'L',
          oz: 'oz',
          floz: 'fl oz',
        };
        result.netContents = {
          volume: parseFloat(sizeMatch[1]),
          unit: unitMap[rawUnit] || 'mL',
          raw: line.trim(),
        };
        break;
      }
    }
  }

  // Class/type detection - look for well-known beverage type patterns
  for (const line of lines) {
    if (!result.classType) {
      const classPatterns = [
        /Kentucky\s+Straight\s+Bourbon/i,
        /Straight\s+Bourbon\s+Whiskey/i,
        /Bourbon\s+Whiskey/i,
        /Tennessee\s+Whiskey/i,
        /Scotch\s+Whisky/i,
        /Irish\s+Whiskey/i,
        /Blended\s+Whiskey/i,
        /Single\s+Malt/i,
        /Vodka/i,
        /Gin/i,
        /Rum/i,
        /Tequila/i,
        /Mezcal/i,
        /Brandy/i,
        /Cognac/i,
        /Distilled\s+Spirits/i,
        /Table\s+Wine/i,
        /Red\s+Wine/i,
        /White\s+Wine/i,
        /Ros[eé]\s+Wine/i,
        /Sparkling\s+Wine/i,
        /Champagne/i,
        /Malt\s+Beverage/i,
        /Lager/i,
        /Ale/i,
        /Stout/i,
        /Porter/i,
        /IPA/i,
      ];
      for (const pattern of classPatterns) {
        if (pattern.test(line)) {
          result.classType = line.trim();
          break;
        }
      }
    }
  }

  // Bottler/producer detection
  for (const line of lines) {
    if (!result.bottlerName) {
      if (
        /Bottled\s+by|Produced\s+by|Distilled\s+by|Brewed\s+by|Imported\s+by|Manufactured\s+by/i.test(
          line,
        )
      ) {
        result.bottlerName = line.trim();
        break;
      }
    }
  }

  // Country of origin detection
  const countryPatterns = [
    /Product\s+of\s+([\w\s]+)/i,
    /Made\s+in\s+([\w\s]+)/i,
    /Imported\s+from\s+([\w\s]+)/i,
    /Country\s+of\s+Origin:\s*([\w\s]+)/i,
  ];
  for (const line of lines) {
    if (!result.countryOfOrigin) {
      for (const pattern of countryPatterns) {
        const match = line.match(pattern);
        if (match) {
          result.countryOfOrigin = match[1].trim();
          break;
        }
      }
    }
  }

  // Brand name heuristic: first prominent non-field line (short, capitalized)
  if (!result.brandName) {
    for (const line of lines) {
      // Skip lines that look like field values we've already parsed
      if (result.abv?.raw === line) continue;
      if (result.netContents?.raw === line) continue;
      if (result.classType === line) continue;
      if (result.governmentWarning?.startsWith(line)) continue;
      if (result.bottlerName === line) continue;

      const isLikelyBrand =
        line.length >= 3 &&
        line.length <= 60 &&
        !/^\d/.test(line) && // doesn't start with number
        !/GOVERNMENT/i.test(line) &&
        !/Surgeon General/i.test(line);

      if (isLikelyBrand) {
        result.brandName = line;
        break;
      }
    }
  }

  return result;
};

const getMockExtractedLabel = (): ExtractedLabel => ({
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
  governmentWarning:
    'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
  rawText:
    'OLD TOM DISTILLERY\nKentucky Straight Bourbon Whiskey\n45% Alc./Vol. (90 Proof)\n750 mL\nBottled by Old Tom Distillery, Inc., Louisville, KY\nGOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.',
});
