import request from 'supertest';
import app from '@/app';

describe('Auth Routes', () => {
  it('should return 400 if email or password missing', async () => {
    const response = await request(app).post('/api/auth/login').send({});

    expect(response.status).toBe(400);
  });

  it('should return token and user on successful login', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'agent@ttb.gov',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.user.role).toBe('agent');
  });
});
