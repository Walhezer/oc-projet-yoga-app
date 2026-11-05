import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../middleware/error.middleware';

export class AuthController {
  
  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    return res.status(200).json(result);
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    return res.status(201).json(result);
  });
  
}