import request from 'supertest';
import app from '@/app';
import { GOVERNMENT_WARNING_TEXT } from '@label-verifier/shared';

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

const appData = {
  applicationId: 'batch-test-001',
  brandName: 'Old Tom Distillery',
  classType: 'Kentucky Straight Bourbon Whiskey',
  abv: { percentage: 45, proof: 90 },
  netContents: { volume: 750, unit: 'mL' },
  governmentWarning: GOVERNMENT_WARNING_TEXT,
  beverage: { type: 'spirits' },
};

const minimalPng = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
  'hex',
);

describe('Batch Routes', () => {
  it('requires authentication for POST /api/batch/upload', async () => {
    const res = await request(app).post('/api/batch/upload');
    expect(res.status).toBe(401);
  });

  it('returns 400 when no files provided', async () => {
    const token = await getAuthToken();
    const res = await request(app)
      .post('/api/batch/upload')
      .set('Authorization', 'Bearer ' + token)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_MISSING');
  });

  it('returns 400 on mismatch between images and applicationData', async () => {
    const token = await getAuthToken();
    const res = await request(app)
      .post('/api/batch/upload')
      .set('Authorization', 'Bearer ' + token)
      .attach('labels', minimalPng, { filename: 'label1.png', contentType: 'image/png' })
      .field('applicationData', JSON.stringify([appData, appData]));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('synchronous batch processes and returns results', async () => {
    const token = await getAuthToken();
    const res = await request(app)
      .post('/api/batch/sync')
      .set('Authorization', 'Bearer ' + token)
      .attach('labels', minimalPng, { filename: 'label1.png', contentType: 'image/png' })
      .attach('labels', minimalPng, { filename: 'label2.png', contentType: 'image/png' })
      .field('applicationData', JSON.stringify([appData, appData]));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.total).toBe(2);
    expect(res.body.data.results).toHaveLength(2);
  });

  it('GET /api/batch/:batchId returns 404 for unknown batch', async () => {
    const token = await getAuthToken();
    const res = await request(app)
      .get('/api/batch/nonexistent-id')
      .set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(404);
  });

  it('GET /api/batch/:batchId returns status for known batch', async () => {
    const token = await getAuthToken();
    // First create a batch via sync
    const syncRes = await request(app)
      .post('/api/batch/sync')
      .set('Authorization', 'Bearer ' + token)
      .attach('labels', minimalPng, { filename: 'l.png', contentType: 'image/png' })
      .field('applicationData', JSON.stringify([appData]));

    const batchId = syncRes.body.data.batchId;

    const statusRes = await request(app)
      .get('/api/batch/' + batchId)
      .set('Authorization', 'Bearer ' + token);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.batchId).toBe(batchId);
    expect(statusRes.body.data.status).toBe('completed');
  });

  it('CSV export works for completed batch', async () => {
    const token = await getAuthToken();
    const syncRes = await request(app)
      .post('/api/batch/sync')
      .set('Authorization', 'Bearer ' + token)
      .attach('labels', minimalPng, { filename: 'l.png', contentType: 'image/png' })
      .field('applicationData', JSON.stringify([appData]));

    const batchId = syncRes.body.data.batchId;

    const csvRes = await request(app)
      .get('/api/batch/' + batchId + '/export/csv')
      .set('Authorization', 'Bearer ' + token);
    expect(csvRes.status).toBe(200);
    expect(csvRes.header['content-type']).toMatch(/text\/csv/);
    expect(csvRes.text).toMatch(/Result ID/);
  });

  it('JSON export works for completed batch', async () => {
    const token = await getAuthToken();
    const syncRes = await request(app)
      .post('/api/batch/sync')
      .set('Authorization', 'Bearer ' + token)
      .attach('labels', minimalPng, { filename: 'l.png', contentType: 'image/png' })
      .field('applicationData', JSON.stringify([appData]));

    const batchId = syncRes.body.data.batchId;

    const jsonRes = await request(app)
      .get('/api/batch/' + batchId + '/export/json')
      .set('Authorization', 'Bearer ' + token);
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body.batchId).toBe(batchId);
    expect(jsonRes.body.results).toBeDefined();
  });
});
