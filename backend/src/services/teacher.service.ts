import { PrismaClient } from '@prisma/client';
import { HttpError } from './session.service';

const prisma = new PrismaClient();

export class TeacherService {
  async getAll() {
    const teachers = await prisma.teacher.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return teachers.map((teacher: any) => ({
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    }));
  }

  async getById(idStr: string) {
    if (!idStr) throw new HttpError(400, 'Teacher ID is required');
    const teacherId = parseInt(idStr);
    if (isNaN(teacherId)) throw new HttpError(400, 'Invalid teacher ID');

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) throw new HttpError(404, 'Teacher not found');

    return {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };
  }
}

export const teacherService = new TeacherService();