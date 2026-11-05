import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sessionService } from '../services/session.service';
import { asyncHandler } from '../middleware/error.middleware';

export class SessionController {
  
  getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const sessions = await sessionService.getAll();
    return res.status(200).json(sessions);
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const session = await sessionService.getById(req.params.id as string);
    return res.status(200).json(session);
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const session = await sessionService.create(req.body, req.userId as number);
    return res.status(201).json(session);
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const session = await sessionService.update(req.params.id as string, req.body, req.userId as number);
    return res.status(200).json(session);
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await sessionService.delete(req.params.id as string, req.userId as number);
    return res.status(200).json(result);
  });

  participate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await sessionService.participate(req.params.id as string, req.params.userId as string);
    return res.status(200).json(result);
  });

  unparticipate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await sessionService.unparticipate(req.params.id as string, req.params.userId as string);
    return res.status(200).json(result);
  });
}