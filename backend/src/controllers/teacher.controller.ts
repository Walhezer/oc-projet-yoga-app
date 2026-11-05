import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { teacherService } from '../services/teacher.service';
import { asyncHandler } from '../middleware/error.middleware';

export class TeacherController {
  getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const teachers = await teacherService.getAll();
    return res.status(200).json(teachers);
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const teacher = await teacherService.getById(req.params.id as string);
    return res.status(200).json(teacher);
  });
}