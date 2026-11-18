import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
    session: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    user: {
        findUnique: vi.fn(),
    },
    teacher: {
        findUnique: vi.fn(),
    },
    sessionParticipation: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function () {
        return mockPrisma;
    }),
}));

const mockSessionDto = vi.hoisted(() => ({
    CreateSessionSchema: {
        parse: vi.fn((data) => data),
    },
    UpdateSessionSchema: {
        parse: vi.fn((data) => data),
    },
}));

vi.mock('../dto/session.dto', () => mockSessionDto);

import { sessionService, HttpError } from './session.service';

describe('SessionService', () => {
    const mockTeacher = {
        id: 1,
        firstName: 'Hélène',
        lastName: 'Thiercelin',
    };

    const mockDbSession = {
        id: 1,
        name: 'Morning Vinyasa',
        date: new Date('2026-12-01T10:00:00.000Z'),
        description: 'Wake up flow',
        teacherId: 1,
        teacher: mockTeacher,
        participants: [{ user: { id: 2 } }],
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        updatedAt: new Date('2026-01-01T10:00:00.000Z'),
    };

    const expectedFormattedSession = {
        id: 1,
        name: 'Morning Vinyasa',
        date: mockDbSession.date,
        description: 'Wake up flow',
        teacher: {
            id: 1,
            firstName: 'Hélène',
            lastName: 'Thiercelin',
        },
        users: [2],
        createdAt: mockDbSession.createdAt,
        updatedAt: mockDbSession.updatedAt,
    };

    const mockAdminUser = { id: 1, email: 'admin@studio.com', admin: true };
    const mockStandardUser = { id: 2, email: 'user@studio.com', admin: false };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAll', () => {
        it('should return all sessions formatted correctly', async () => {
            mockPrisma.session.findMany.mockResolvedValue([mockDbSession]);

            const result = await sessionService.getAll();

            expect(mockPrisma.session.findMany).toHaveBeenCalled();
            expect(result).toEqual([expectedFormattedSession]);
        });
    });

    describe('getById', () => {
        it('should return a session when a valid ID is provided', async () => {
            mockPrisma.session.findUnique.mockResolvedValue(mockDbSession);

            const result = await sessionService.getById('1');

            expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
                include: { teacher: true, participants: { include: { user: true } } },
            });
            expect(result).toEqual(expectedFormattedSession);
        });

        it('should throw 400 HttpError if ID is empty', async () => {
            await expect(sessionService.getById('')).rejects.toMatchObject({
                statusCode: 400,
                message: 'Session ID is required',
            });
        });

        it('should throw 400 HttpError if ID is not a number', async () => {
            await expect(sessionService.getById('abc')).rejects.toMatchObject({
                statusCode: 400,
                message: 'Invalid session ID',
            });
        });

        it('should throw 404 HttpError if session does not exist', async () => {
            mockPrisma.session.findUnique.mockResolvedValue(null);

            await expect(sessionService.getById('99')).rejects.toMatchObject({
                statusCode: 404,
                message: 'Session not found',
            });
        });
    });

    describe('create', () => {
        it('should create a session when user is admin and teacher exists', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
            mockPrisma.teacher.findUnique.mockResolvedValue(mockTeacher);
            mockPrisma.session.create.mockResolvedValue({
                ...mockDbSession,
                participants: [],
            });

            const inputData = {
                name: 'Morning Vinyasa',
                date: '2026-12-01T10:00:00.000Z',
                description: 'Wake up flow',
                teacherId: 1,
            };

            const result = await sessionService.create(inputData, 1);

            expect(mockPrisma.session.create).toHaveBeenCalled();
            expect(result.users).toEqual([]);
            expect(result.name).toBe('Morning Vinyasa');
        });

        it('should throw 403 HttpError if user is not an admin', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockStandardUser);

            await expect(sessionService.create({}, 2)).rejects.toMatchObject({
                statusCode: 403,
                message: 'Admin access required',
            });
        });

        it('should throw 403 HttpError if user does not exist', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await expect(sessionService.create({}, 99)).rejects.toMatchObject({
                statusCode: 403,
                message: 'Admin access required',
            });
        });

        it('should throw 404 HttpError if teacher does not exist', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
            mockPrisma.teacher.findUnique.mockResolvedValue(null);

            const inputData = { teacherId: 99 };
            await expect(sessionService.create(inputData, 1)).rejects.toMatchObject({
                statusCode: 404,
                message: 'Teacher not found',
            });
        });
    });

    describe('update', () => {
        it('should update session when admin and session/teacher exist', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
            mockPrisma.session.findUnique.mockResolvedValue(mockDbSession);
            mockPrisma.teacher.findUnique.mockResolvedValue(mockTeacher);
            mockPrisma.session.update.mockResolvedValue(mockDbSession);

            const result = await sessionService.update('1', { name: 'Updated', teacherId: 1 }, 1);

            expect(mockPrisma.session.update).toHaveBeenCalled();
            expect(result).toEqual(expectedFormattedSession);
        });

        it('should throw 400 HttpError if ID is empty', async () => {
            await expect(sessionService.update('', {}, 1)).rejects.toMatchObject({
                statusCode: 400,
                message: 'Session ID is required',
            });
        });

        it('should throw 400 HttpError if ID is not a number', async () => {
            await expect(sessionService.update('abc', {}, 1)).rejects.toMatchObject({
                statusCode: 400,
                message: 'Invalid session ID',
            });
        });

        it('should throw 403 HttpError if user is not admin', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockStandardUser);

            await expect(sessionService.update('1', {}, 2)).rejects.toMatchObject({
                statusCode: 403,
                message: 'Admin access required',
            });
        });

        it('should throw 404 HttpError if session to update does not exist', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
            mockPrisma.session.findUnique.mockResolvedValue(null);

            await expect(sessionService.update('1', {}, 1)).rejects.toMatchObject({
                statusCode: 404,
                message: 'Session not found',
            });
        });

        it('should throw 404 HttpError if new teacherId does not exist', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
            mockPrisma.session.findUnique.mockResolvedValue(mockDbSession);
            mockPrisma.teacher.findUnique.mockResolvedValue(null);

            await expect(sessionService.update('1', { teacherId: 99 }, 1)).rejects.toMatchObject({
                statusCode: 404,
                message: 'Teacher not found',
            });
        });

        it('should update session with a new valid teacherId', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
            mockPrisma.session.findUnique.mockResolvedValue(mockDbSession);
            mockPrisma.teacher.findUnique.mockResolvedValue(mockTeacher);
            mockPrisma.session.update.mockResolvedValue(mockDbSession);

            const result = await sessionService.update('1', { teacherId: 1 }, 1);

            expect(mockPrisma.teacher.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(mockPrisma.session.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ teacherId: 1 }),
                })
            );
            expect(result).toHaveProperty('id', 1);
        });

        it('should update session name and date without updating teacherId', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
            mockPrisma.session.findUnique.mockResolvedValue(mockDbSession);
            mockPrisma.session.update.mockResolvedValue(mockDbSession);

            const result = await sessionService.update('1', { name: 'New Name', date: '2026-12-02T10:00:00.000Z', description: 'New desc' }, 1);

            expect(mockPrisma.teacher.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.session.update).toHaveBeenCalled();
            expect(result).toHaveProperty('id', 1);
        });
        
    });

    describe('delete', () => {
        it('should delete session if admin and session exists', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
            mockPrisma.session.findUnique.mockResolvedValue(mockDbSession);
            mockPrisma.session.delete.mockResolvedValue(mockDbSession);

            const result = await sessionService.delete('1', 1);

            expect(mockPrisma.session.delete).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(result).toEqual({ message: 'Session deleted successfully' });
        });

        it('should throw 400 HttpError if ID is empty', async () => {
            await expect(sessionService.delete('', 1)).rejects.toMatchObject({
                statusCode: 400,
                message: 'Session ID is required',
            });
        });

        it('should throw 400 HttpError if ID is not a number', async () => {
            await expect(sessionService.delete('abc', 1)).rejects.toMatchObject({
                statusCode: 400,
                message: 'Invalid session ID',
            });
        });

        it('should throw 403 HttpError if user is not admin', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockStandardUser);

            await expect(sessionService.delete('1', 2)).rejects.toMatchObject({
                statusCode: 403,
                message: 'Admin access required',
            });
        });

        it('should throw 404 HttpError if session does not exist', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
            mockPrisma.session.findUnique.mockResolvedValue(null);

            await expect(sessionService.delete('1', 1)).rejects.toMatchObject({
                statusCode: 404,
                message: 'Session not found',
            });
        });
    });

    describe('participate', () => {
        it('should allow user to join session if not already participating', async () => {
            mockPrisma.session.findUnique.mockResolvedValue(mockDbSession);
            mockPrisma.user.findUnique.mockResolvedValue(mockStandardUser);
            mockPrisma.sessionParticipation.findUnique.mockResolvedValue(null);
            mockPrisma.sessionParticipation.create.mockResolvedValue({});

            const result = await sessionService.participate('1', '2');

            expect(mockPrisma.sessionParticipation.create).toHaveBeenCalledWith({
                data: { sessionId: 1, userId: 2 },
            });
            expect(result).toEqual({ message: 'Successfully joined the session' });
        });

        it('should throw 400 HttpError if session ID or user ID is missing/invalid', async () => {
            await expect(sessionService.participate('', '2')).rejects.toMatchObject({ statusCode: 400, message: 'Session ID is required' });
            await expect(sessionService.participate('1', '')).rejects.toMatchObject({ statusCode: 400, message: 'User ID is required' });
            await expect(sessionService.participate('abc', '2')).rejects.toMatchObject({ statusCode: 400, message: 'Invalid session ID' });
            await expect(sessionService.participate('1', 'abc')).rejects.toMatchObject({ statusCode: 400, message: 'Invalid user ID' });
        });

        it('should throw 404 HttpError if session or user not found', async () => {
            mockPrisma.session.findUnique.mockResolvedValue(null);
            await expect(sessionService.participate('1', '2')).rejects.toMatchObject({ statusCode: 404, message: 'Session not found' });

            mockPrisma.session.findUnique.mockResolvedValue(mockDbSession);
            mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(sessionService.participate('1', '2')).rejects.toMatchObject({ statusCode: 404, message: 'User not found' });
        });

        it('should throw 400 HttpError if user already participating', async () => {
            mockPrisma.session.findUnique.mockResolvedValue(mockDbSession);
            mockPrisma.user.findUnique.mockResolvedValue(mockStandardUser);
            mockPrisma.sessionParticipation.findUnique.mockResolvedValue({ sessionId: 1, userId: 2 });

            await expect(sessionService.participate('1', '2')).rejects.toMatchObject({
                statusCode: 400,
                message: 'User already participating in this session',
            });
        });
    });

    describe('unparticipate', () => {
        it('should allow user to leave session if participation exists', async () => {
            mockPrisma.sessionParticipation.findUnique.mockResolvedValue({ sessionId: 1, userId: 2 });
            mockPrisma.sessionParticipation.delete.mockResolvedValue({});

            const result = await sessionService.unparticipate('1', '2');

            expect(mockPrisma.sessionParticipation.delete).toHaveBeenCalled();
            expect(result).toEqual({ message: 'Successfully left the session' });
        });

        it('should throw 400 HttpError if session ID or user ID is missing/invalid', async () => {
            await expect(sessionService.unparticipate('', '2')).rejects.toMatchObject({ statusCode: 400, message: 'Session ID is required' });
            await expect(sessionService.unparticipate('1', '')).rejects.toMatchObject({ statusCode: 400, message: 'User ID is required' });
            await expect(sessionService.unparticipate('xyz', '2')).rejects.toMatchObject({ statusCode: 400, message: 'Invalid session ID' });
            await expect(sessionService.unparticipate('1', 'xyz')).rejects.toMatchObject({ statusCode: 400, message: 'Invalid user ID' });
        });

        it('should throw 404 HttpError if participation does not exist', async () => {
            mockPrisma.sessionParticipation.findUnique.mockResolvedValue(null);

            await expect(sessionService.unparticipate('1', '2')).rejects.toMatchObject({
                statusCode: 404,
                message: 'Participation not found',
            });
        });
    });
});