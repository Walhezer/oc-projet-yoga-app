import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import app from '../app';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('AuthController (Integration)', () => {
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

  afterAll(async () => {
    await prisma.$disconnect();
    // Fermeture propre du serveur après les tests
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(async () => {
    await prisma.sessionParticipation.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should register a new user successfully and return 201 with token', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'claire.martin@studio.com',
        password: 'Password123!',
        firstName: 'Claire',
        lastName: 'Martin',
      }),
    });

    expect(response.status).toBe(201);
    const data = (await response.json()) as { token: string; email: string };
    expect(data).toHaveProperty('token');
    expect(data.email).toBe('claire.martin@studio.com');
  });

  it('should log in an existing user successfully and return 200 with token', async () => {
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'login.user@studio.com',
        password: 'Password123!',
        firstName: 'Login',
        lastName: 'Test',
      }),
    });

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'login.user@studio.com',
        password: 'Password123!',
      }),
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { token: string; email: string };
    expect(data).toHaveProperty('token');
    expect(data.email).toBe('login.user@studio.com');
  });

  it('should return 401 status when logging in with invalid credentials', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'unknown@studio.com',
        password: 'WrongPassword!',
      }),
    });

    expect(response.status).toBe(401);
  });
});