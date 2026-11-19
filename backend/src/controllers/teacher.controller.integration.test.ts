import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt.util';

const prisma = new PrismaClient();

describe('TeacherController (Integration)', () => {
  let server: Server;
  let baseUrl: string;
  let userToken: string;
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

    const user = await prisma.user.create({
      data: {
        email: 'user@studio.com',
        password: 'hashed_password',
        firstName: 'Claire',
        lastName: 'Martin',
        admin: false,
      },
    });
    userToken = generateToken(user.id);

    const teacher = await prisma.teacher.create({
      data: {
        firstName: 'Hélène',
        lastName: 'Michel',
      },
    });
    teacherId = teacher.id;
  });

  it('should return 401 when no token is provided (GET /api/teacher)', async () => {
    const response = await fetch(`${baseUrl}/api/teacher`);
    expect(response.status).toBe(401);
  });

  it('should return all teachers (GET /api/teacher)', async () => {
    const response = await fetch(`${baseUrl}/api/teacher`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json() as Array<{ id: number; firstName: string; lastName: string }>;
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: teacherId,
      firstName: 'Hélène',
      lastName: 'Michel',
    });
  });

  it('should return a teacher by ID (GET /api/teacher/:id)', async () => {
    const response = await fetch(`${baseUrl}/api/teacher/${teacherId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject({
      id: teacherId,
      firstName: 'Hélène',
      lastName: 'Michel',
    });
  });

  it('should return 404 when teacher does not exist (GET /api/teacher/:id)', async () => {
    const response = await fetch(`${baseUrl}/api/teacher/99999`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(response.status).toBe(404);
  });

  it('should return 400 when teacher ID is invalid (GET /api/teacher/:id)', async () => {
    const response = await fetch(`${baseUrl}/api/teacher/abc`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(response.status).toBe(400);
  });
});