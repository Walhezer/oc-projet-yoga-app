import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt.util';

const prisma = new PrismaClient();

describe('UserController (Integration)', () => {
  let server: Server;
  let baseUrl: string;
  let userId: number;
  let userToken: string;

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
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(async () => {
    await prisma.sessionParticipation.deleteMany();
    await prisma.session.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        email: 'claire@studio.com',
        password: 'hashed_password',
        firstName: 'Claire',
        lastName: 'Martin',
        admin: false,
      },
    });
    userId = user.id;
    userToken = generateToken(user.id);
  });

  it('should return 401 when no token is provided (GET /api/user/:id)', async () => {
    const response = await fetch(`${baseUrl}/api/user/${userId}`);
    expect(response.status).toBe(401);
  });

  it('should return a user by ID (GET /api/user/:id)', async () => {
    const response = await fetch(`${baseUrl}/api/user/${userId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject({
      id: userId,
      email: 'claire@studio.com',
      firstName: 'Claire',
      lastName: 'Martin',
      admin: false,
    });
  });

  it('should return 404 when user does not exist (GET /api/user/:id)', async () => {
    const response = await fetch(`${baseUrl}/api/user/99999`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(response.status).toBe(404);
  });

  it('should return 400 when user ID is invalid (GET /api/user/:id)', async () => {
    const response = await fetch(`${baseUrl}/api/user/abc`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(response.status).toBe(400);
  });

it('should return 403 when promoting self to admin outside development (POST /api/user/promote-admin)', async () => {
    const response = await fetch(`${baseUrl}/api/user/promote-admin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(response.status).toBe(403);
  });

  it('should promote the authenticated user to admin in development (POST /api/user/promote-admin)', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    try {
      const response = await fetch(`${baseUrl}/api/user/promote-admin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(updatedUser?.admin).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('should delete the authenticated user account (DELETE /api/user/:id)', async () => {
    const response = await fetch(`${baseUrl}/api/user/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(response.status).toBe(200);
    const deletedUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(deletedUser).toBeNull();
  });
});