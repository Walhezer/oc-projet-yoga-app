import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt.util';

const prisma = new PrismaClient();

describe('SessionController (Integration)', () => {
  let server: Server;
  let baseUrl: string;
  let adminToken: string;
  let userToken: string;
  let standardUserId: number;
  let teacherId: number;

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

    const admin = await prisma.user.create({
      data: {
        email: 'admin@studio.com',
        password: 'hashed_password',
        firstName: 'Admin',
        lastName: 'User',
        admin: true,
      },
    });
    adminToken = generateToken(admin.id);

    const user = await prisma.user.create({
      data: {
        email: 'user@studio.com',
        password: 'hashed_password',
        firstName: 'Claire',
        lastName: 'Martin',
        admin: false,
      },
    });
    standardUserId = user.id;
    userToken = generateToken(user.id);

    const teacher = await prisma.teacher.create({
      data: {
        firstName: 'Hélène',
        lastName: 'Thiercelin',
      },
    });
    teacherId = teacher.id;
  });

  describe('Auth middleware protection', () => {
    it('should return 401 when no Authorization header is provided', async () => {
      const response = await fetch(`${baseUrl}/api/session`);
      expect(response.status).toBe(401);
    });

    it('should return 401 when token is invalid', async () => {
      const response = await fetch(`${baseUrl}/api/session`, {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      expect(response.status).toBe(401);
    });
  });

  describe('CRUD & Participation', () => {
    it('should create a session as admin (POST /api/session)', async () => {
      const response = await fetch(`${baseUrl}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Morning Vinyasa',
          date: '2026-12-01T10:00:00.000Z',
          description: 'Wake up yoga flow',
          teacherId,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json() as { name: string; teacher: { id: number } };
      expect(data.name).toBe('Morning Vinyasa');
      expect(data.teacher.id).toBe(teacherId);
    });

    it('should return 403 when a non-admin tries to create a session', async () => {
      const response = await fetch(`${baseUrl}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          name: 'Unauthorized Session',
          date: '2026-12-01T10:00:00.000Z',
          description: 'Should fail',
          teacherId,
        }),
      });

      expect(response.status).toBe(403);
    });

    it('should return all sessions (GET /api/session)', async () => {
      await prisma.session.create({
        data: {
          name: 'Evening Yin',
          date: new Date('2026-12-02T18:00:00.000Z'),
          description: 'Relaxing stretch',
          teacherId,
        },
      });

      const response = await fetch(`${baseUrl}/api/session`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json() as { name: string }[];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Evening Yin');
    });

    it('should return a session by ID (GET /api/session/:id)', async () => {
      const session = await prisma.session.create({
        data: {
          name: 'Power Yoga',
          date: new Date('2026-12-03T12:00:00.000Z'),
          description: 'Dynamic session',
          teacherId,
        },
      });

      const response = await fetch(`${baseUrl}/api/session/${session.id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json() as { id: number; name: string };
      expect(data.id).toBe(session.id);
      expect(data.name).toBe('Power Yoga');
    });

    it('should update a session as admin (PUT /api/session/:id)', async () => {
      const session = await prisma.session.create({
        data: {
          name: 'Old Name',
          date: new Date('2026-12-04T10:00:00.000Z'),
          description: 'Old description',
          teacherId,
        },
      });

      const response = await fetch(`${baseUrl}/api/session/${session.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Updated Name',
          description: 'Updated description',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as { name: string };
      expect(data.name).toBe('Updated Name');
    });

    it('should allow a user to participate and unparticipate in a session', async () => {
      const session = await prisma.session.create({
        data: {
          name: 'Hatha Yoga',
          date: new Date('2026-12-05T09:00:00.000Z'),
          description: 'Classic poses',
          teacherId,
        },
      });

      const joinRes = await fetch(
        `${baseUrl}/api/session/${session.id}/participate/${standardUserId}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      expect(joinRes.status).toBe(200);

      const leaveRes = await fetch(
        `${baseUrl}/api/session/${session.id}/participate/${standardUserId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      expect(leaveRes.status).toBe(200);
    });

    it('should delete a session as admin (DELETE /api/session/:id)', async () => {
      const session = await prisma.session.create({
        data: {
          name: 'To Delete',
          date: new Date('2026-12-06T15:00:00.000Z'),
          description: 'Will be deleted',
          teacherId,
        },
      });

      const response = await fetch(`${baseUrl}/api/session/${session.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.status).toBe(200);
      const deleted = await prisma.session.findUnique({ where: { id: session.id } });
      expect(deleted).toBeNull();
    });
  });
});