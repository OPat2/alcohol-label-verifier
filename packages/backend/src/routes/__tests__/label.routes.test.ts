import request from 'supertest';
import app from '@/app';
import { GOVERNMENT_WARNING_TEXT } from '@shared/constants';

// Mock OCR to avoid Tesseract startup in tests
beforeAll(() => {
  process.env.MOCK_VISION_API = 'true';
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
});

const getAuthToken = async (): Promise<string> => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'agent@ttb.gov', password: 'password123' });
  return res.body.data.token;
};

const sampleApplicationData = {
  applicationId: 'test-app-001',
  brandName: 'Old Tom Distillery',
  classType: 'Kentucky Straight Bourbon Whiskey',
  abv: { percentage: 45, proof: 90 },
  netContents: { volume: 750, unit: 'mL' },
  governmentWarning: GOVERNMENT_WARNING_TEXT,
  bottlerName: 'Old Tom Distillery, Inc.',
  countryOfOrigin: 'USA',
  beverage: { type: 'spirits' },
};

// Minimal 1x1 PNG for test
const minimalPng = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
  'hex',
);

describe('Label Routes', () => {
  it('requires authentication for POST /api/labels/verify', async () => {
    const res = await request(app).post('/api/labels/verify');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_UNAUTHORIZED');
  });

  it('returns 400 when no image is provided', async () => {
    const token = await getAuthToken();
    const res = await request(app)
      .post('/api/labels/verify')
      .set('Authorization', 'Bearer ' + token)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_MISSING');
  });

  it('returns 400 when applicationData is missing', async () => {
    const token = await getAuthToken();
    const res = await request(app)
      .post('/api/labels/verify')
      .set('Authorization', 'Bearer ' + token)
      .attach('labelImage', minimalPng, { filename: 'label.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('successfully verifies a label (mock OCR mode)', async () => {
    const token = await getAuthToken();
    const res = await request(app)
      .post('/api/labels/verify')
      .set('Authorization', 'Bearer ' + token)
      .attach('labelImage', minimalPng, { filename: 'label.png', contentType: 'image/png' })
      .field('applicationData', JSON.stringify(sampleApplicationData));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: expect.any(String),
      overallConfidence: expect.any(Number),
      status: expect.stringMatching(/approved|review_required|rejected/),
      comparisons: expect.arrayContaining([
        expect.objectContaining({ field: 'brandName' }),
      ]),
    });
  });

  it('result includes governmentWarning comparison', async () => {
    const token = await getAuthToken();
    const res = await request(app)
      .post('/api/labels/verify')
      .set('Authorization', 'Bearer ' + token)
      .attach('labelImage', minimalPng, { filename: 'label.png', contentType: 'image/png' })
      .field('applicationData', JSON.stringify(sampleApplicationData));

    const comparisons = res.body.data.comparisons;
    const warningComp = comparisons.find((c: { field: string; match: boolean }) => c.field === 'governmentWarning');
    expect(warningComp).toBeDefined();
    expect(warningComp.match).toBe(true);
  });

  it('result includes timing data', async () => {
    const token = await getAuthToken();
    const res = await request(app)
      .post('/api/labels/verify')
      .set('Authorization', 'Bearer ' + token)
      .attach('labelImage', minimalPng, { filename: 'label.png', contentType: 'image/png' })
      .field('applicationData', JSON.stringify(sampleApplicationData));

    expect(res.body.data.timings).toBeDefined();
    expect(res.body.data.timings.totalMs).toBeGreaterThanOrEqual(0);
  });

  it('returns 400 for invalid applicationData JSON', async () => {
    const token = await getAuthToken();
    const res = await request(app)
      .post('/api/labels/verify')
      .set('Authorization', 'Bearer ' + token)
      .attach('labelImage', minimalPng, { filename: 'label.png', contentType: 'image/png' })
      .field('applicationData', 'not-valid-json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 400 when brandName is missing from applicationData', async () => {
    const token = await getAuthToken();
    const badApp = { ...sampleApplicationData, brandName: undefined } as any;
    const res = await request(app)
      .post('/api/labels/verify')
      .set('Authorization', 'Bearer ' + token)
      .attach('labelImage', minimalPng, { filename: 'label.png', contentType: 'image/png' })
      .field('applicationData', JSON.stringify(badApp));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
