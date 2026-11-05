import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { userService } from '../services/user.service';
import { asyncHandler } from '../middleware/error.middleware';

export class UserController {
  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await userService.getById(req.params.id as string);
    return res.status(200).json(user);
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await userService.delete(req.params.id as string, req.userId as number);
    return res.status(200).json(result);
  });

  promoteSelfToAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await userService.promoteSelfToAdmin(req.userId as number);
    return res.status(200).json(result);
  });
}