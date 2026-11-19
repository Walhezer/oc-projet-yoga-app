import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { Server } from 'http';
import app from './app';
import { authService } from './services/auth.service';

describe('App & Middlewares (Integration)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should return 200 on health check (GET /api/health)', async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ status: 'ok', message: 'Yoga Studio API is running' });
  });

  it('should return 401 when Authorization header format is invalid', async () => {
    const response = await fetch(`${baseUrl}/api/session`, {
      headers: { Authorization: 'InvalidFormat' },
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({ message: 'Invalid token format' });
  });

  it('should return 400 on Zod validation error (POST /api/auth/register)', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json() as { message: string };
    expect(data.message).toMatch(/^Validation error:/);
  });

  it('should return 500 on unexpected server error', async () => {
    vi.spyOn(authService, 'login').mockRejectedValueOnce(new Error('Unexpected crash'));

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@studio.com', password: 'Password123!' }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ message: 'Internal server error' });
  });
});