import request from 'supertest';
import app from '@/app';

jest.mock('@/services/vision.service');
jest.mock('@/services/validator.service');

describe('Label Routes', () => {
  const mockToken = 'Bearer mock-token';

  it('should require authentication for /api/labels/verify', async () => {
    const response = await request(app).post('/api/labels/verify');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_UNAUTHORIZED');
  });

  it('should require image file for verification', async () => {
    const response = await request(app)
      .post('/api/labels/verify')
      .set('Authorization', mockToken);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('FILE_MISSING');
  });
});
