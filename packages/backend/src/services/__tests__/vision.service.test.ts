import { extractLabelText } from '@/services/vision.service';

jest.mock('@google-cloud/vision');

describe('VisionService', () => {
  beforeEach(() => {
    process.env.MOCK_VISION_API = 'true';
  });

  it('should extract label text using mock API', async () => {
    const mockImageBuffer = Buffer.from('fake image data');
    const result = await extractLabelText(mockImageBuffer);

    expect(result).toBeDefined();
    expect(result.brandName).toBe('OLD TOM DISTILLERY');
    expect(result.abv?.percentage).toBe(45);
    expect(result.netContents?.volume).toBe(750);
  });

  it('should return extracted label with raw text', async () => {
    const mockImageBuffer = Buffer.from('fake image data');
    const result = await extractLabelText(mockImageBuffer);

    expect(result.rawText).toBeDefined();
    expect(result.rawText.length).toBeGreaterThan(0);
  });
});
