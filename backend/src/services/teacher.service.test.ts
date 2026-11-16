import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
    teacher: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
    },
}));

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function () {
        return mockPrisma;
    }),
}));

import { teacherService } from './teacher.service';

describe('TeacherService', () => {
    const mockTeachers = [
        {
            id: 1,
            firstName: 'Margot',
            lastName: 'Delahaye',
            createdAt: new Date('2026-01-01T10:00:00.000Z'),
            updatedAt: new Date('2026-01-01T10:00:00.000Z'),
        },
        {
            id: 2,
            firstName: 'Hélène',
            lastName: 'Thiercelin',
            createdAt: new Date('2026-01-02T10:00:00.000Z'),
            updatedAt: new Date('2026-01-02T10:00:00.000Z'),
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAll', () => {
        it('should return all teachers ordered by createdAt desc', async () => {
            mockPrisma.teacher.findMany.mockResolvedValue(mockTeachers);

            const result = await teacherService.getAll();

            expect(mockPrisma.teacher.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: 'desc' },
            });
            expect(result).toEqual(mockTeachers);
        });
    });

    describe('getById', () => {
        it('should return a teacher when a valid ID is provided', async () => {
            mockPrisma.teacher.findUnique.mockResolvedValue(mockTeachers[0]);

            const result = await teacherService.getById('1');

            expect(mockPrisma.teacher.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
            });
            expect(result).toEqual(mockTeachers[0]);
        });

        it('should throw 400 HttpError if ID is empty', async () => {
            await expect(teacherService.getById('')).rejects.toMatchObject({
                statusCode: 400,
                message: 'Teacher ID is required',
            });
            expect(mockPrisma.teacher.findUnique).not.toHaveBeenCalled();
        });

        it('should throw 400 HttpError if ID is not a number', async () => {
            await expect(teacherService.getById('abc')).rejects.toMatchObject({
                statusCode: 400,
                message: 'Invalid teacher ID',
            });
            expect(mockPrisma.teacher.findUnique).not.toHaveBeenCalled();
        });

        it('should throw 404 HttpError if teacher does not exist in DB', async () => {
            mockPrisma.teacher.findUnique.mockResolvedValue(null);

            await expect(teacherService.getById('999')).rejects.toMatchObject({
                statusCode: 404,
                message: 'Teacher not found',
            });
        });
    });
});