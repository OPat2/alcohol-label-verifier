import { GoogleCloudVision } from '@google-cloud/vision';
import { createLogger } from '@/utils/logger';
import { ExtractedLabel } from '@shared/types';
import sharp from 'sharp';

const logger = createLogger('services:vision');

let visionClient: GoogleCloudVision | null = null;

const getVisionClient = () => {
  if (!visionClient) {
    visionClient = new GoogleCloudVision({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
    });
  }
  return visionClient;
};

export const preprocessImage = async (imageBuffer: Buffer): Promise<Buffer> => {
  try {
    const processed = await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF
      .normalize() // Normalize contrast
      .threshold(150) // Enhance text
      .toBuffer();

    return processed;
  } catch (error) {
    logger.warn('Image preprocessing failed, using original', error);
    return imageBuffer;
  }
};

export const extractLabelText = async (imageBuffer: Buffer): Promise<ExtractedLabel> => {
  try {
    if (process.env.MOCK_VISION_API === 'true') {
      return getMockExtractedLabel();
    }

    const client = getVisionClient();
    const request = {
      image: { content: imageBuffer },
      features: [
        { type: 'TEXT_DETECTION' },
        { type: 'LABEL_DETECTION' },
      ],
    };

    const [result] = await client.annotateImage(request);
    const textAnnotations = result.textAnnotations || [];

    if (textAnnotations.length === 0) {
      throw new Error('No text detected in image');
    }

    const rawText = textAnnotations[0].description || '';
    const extracted = parseExtractedText(rawText);

    return extracted;
  } catch (error) {
    logger.error('Vision API error', error);
    throw error;
  }
};

const parseExtractedText = (text: string): ExtractedLabel => {
  const lines = text.split('\n');
  const result: ExtractedLabel = { rawText: text };

  for (const line of lines) {
    const trimmed = line.trim();

    // Brand name heuristic (usually first significant line)
    if (!result.brandName && trimmed.length > 3 && trimmed.length < 100) {
      result.brandName = trimmed;
    }

    // ABV detection
    if (!result.abv) {
      const abvMatch = trimmed.match(/(\d+(?:\.\d{1,2})?)\s*%|(?:\d+(?:\.\d{1,2})?)\s*proof/i);
      if (abvMatch) {
        result.abv = { raw: trimmed };
        if (trimmed.includes('%')) {
          result.abv.percentage = parseFloat(abvMatch[1]);
        }
        if (trimmed.toLowerCase().includes('proof')) {
          result.abv.proof = parseFloat(abvMatch[1]);
        }
      }
    }

    // Net contents detection
    if (!result.netContents) {
      const sizeMatch = trimmed.match(/(\d+(?:\.\d{1,2})?)\s*(mL|L|oz|fl oz)/i);
      if (sizeMatch) {
        result.netContents = {
          volume: parseFloat(sizeMatch[1]),
          unit: sizeMatch[2] as any,
          raw: trimmed,
        };
      }
    }

    // Government warning detection
    if (!result.governmentWarning && trimmed.toUpperCase().includes('GOVERNMENT')) {
      result.governmentWarning = trimmed;
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
  governmentWarning: 'GOVERNMENT WARNING: (1) According to the Surgeon General...',
  rawText: 'Mock OCR output',
});
